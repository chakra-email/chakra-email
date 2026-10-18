import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkExitCode,
  checkTemplates,
  formatCheckReport,
} from './check-templates.js';
import type { PreviewConfig } from './config.js';
import { exportTemplates } from './export-templates.js';
import { previewLintRules } from './lint-rules.js';
import type { TemplateModule } from './render-template.js';

const loader = vi.hoisted(() => ({
  modules: new Map<string, TemplateModule>(),
  close: vi.fn(async () => undefined),
}));
const network = vi.hoisted(() => ({
  create: vi.fn(() => async () => ({
    findings: [
      {
        category: 'content' as const,
        message: 'Redirect.',
        ruleId: 'link-redirect',
        severity: 'info' as const,
        suggestion: 'Use the final URL.',
      },
    ],
    checked: 1,
    skipped: 0,
  })),
}));
vi.mock('./check-links.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./check-links.js')>()),
  createEmailLinkChecker: network.create,
}));
vi.mock('./vite-loader.js', () => ({
  createTemplateModuleLoader: async () => ({
    close: loader.close,
    load: async (path: string) => {
      const module = loader.modules.get(basename(path));
      if (!module) throw new Error('Module failed to load.');
      return module;
    },
  }),
}));

describe('checkTemplates', () => {
  let root: string;
  let config: PreviewConfig;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'chakra-email-check-'));
    loader.modules.clear();
    loader.close.mockClear();
    network.create.mockClear();
    await Promise.all(
      ['a.email.tsx', 'b.email.tsx'].map((file) =>
        writeFile(join(root, file), '// fixture'),
      ),
    );
    loader.modules.set('a.email.tsx', {
      default: () => createElement('p'),
      previewProps: { mode: 'pass' },
      previewVariants: { zebra: { mode: 'warning' }, alpha: { mode: 'error' } },
    });
    loader.modules.set('b.email.tsx', { default: () => createElement('p') });
    config = {
      root,
      templates: '.',
      lint: {
        rules: {
          ...Object.fromEntries(
            previewLintRules.map((rule) => [rule.id, 'off' as const]),
          ),
          'image-alt': 'error',
          'insecure-url': 'warning',
        },
      },
      renderer: {
        render: async (element) => {
          const mode = (element as ReactElement<{ mode?: string }>).props.mode;
          if (mode === 'throw') throw new Error('Fixture exploded.');
          return {
            html:
              mode === 'error'
                ? '<img src="https://example.org/image.png">'
                : mode === 'warning'
                  ? '<img alt="Example" src="http://example.org/image.png">'
                  : '<p>Ready to send.</p>',
            text: 'Ready to send.',
          };
        },
      },
    };
  });
  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('returns the versioned JSON report sorted by path, variant, and line', async () => {
    const report = await checkTemplates({ config });
    expect(report).toMatchObject({
      version: 1,
      summary: { templates: 2, renders: 4, error: 1, warning: 1, info: 0 },
    });
    expect(
      report.results.map((result) => [result.template.path, result.variant]),
    ).toEqual([
      ['a.email.tsx', null],
      ['a.email.tsx', 'alpha'],
      ['a.email.tsx', 'zebra'],
      ['b.email.tsx', null],
    ]);
    expect(checkExitCode(report)).toBe(1);
    expect(loader.close).toHaveBeenCalledOnce();
  });

  it('can skip variants and return exit code zero', async () => {
    const report = await checkTemplates({ config, includeVariants: false });
    expect(report.summary).toEqual({
      templates: 2,
      renders: 2,
      error: 0,
      warning: 0,
      info: 0,
    });
    expect(checkExitCode(report, true)).toBe(0);
  });

  it('applies CLI overrides over config, including off, and supports strict warnings', async () => {
    const report = await checkTemplates({
      config,
      rules: { 'image-alt': 'warning', 'insecure-url': 'off' },
    });
    expect(report.summary).toMatchObject({ error: 0, warning: 1 });
    expect(checkExitCode(report)).toBe(0);
    expect(checkExitCode(report, true)).toBe(1);
    expect(report.results[1].findings[0]).toMatchObject({
      ruleId: 'image-alt',
      severity: 'warning',
    });
  });

  it('reports a throwing default template and continues with other templates', async () => {
    loader.modules.set('a.email.tsx', {
      default: () => createElement('p'),
      previewProps: { mode: 'throw' },
    });
    const report = await checkTemplates({ config });
    expect(report.summary).toMatchObject({
      templates: 2,
      renders: 2,
      error: 1,
    });
    expect(report.results[0].findings).toEqual([
      expect.objectContaining({
        ruleId: 'render-failed',
        severity: 'error',
        message: 'Fixture exploded.',
      }),
    ]);
    expect(report.results[1].findings).toEqual([]);
    expect(checkExitCode(report)).toBe(1);
  });

  it('continues after one variant fails and closes the loader', async () => {
    loader.modules.set('a.email.tsx', {
      ...loader.modules.get('a.email.tsx'),
      previewVariants: {
        alpha: { mode: 'throw' },
        zebra: { mode: 'warning' },
      },
    });
    const report = await checkTemplates({ config });
    expect(report.summary).toMatchObject({ renders: 4, error: 1, warning: 1 });
    expect(report.results[1].variant).toBe('alpha');
    expect(report.results[1].findings[0].ruleId).toBe('render-failed');
    expect(loader.close).toHaveBeenCalledOnce();
  });

  it('checks variants that repair a failed default render', async () => {
    loader.modules.set('a.email.tsx', {
      default: () => createElement('p'),
      previewProps: { mode: 'throw' },
      previewVariants: { alpha: { mode: 'pass' }, zebra: { mode: 'warning' } },
    });
    const report = await checkTemplates({ config });
    expect(report.summary).toMatchObject({
      templates: 2,
      renders: 4,
      error: 1,
      warning: 1,
    });
    expect(
      report.results.map((result) => [
        result.variant,
        result.findings.map((finding) => finding.ruleId),
      ]),
    ).toEqual([
      [null, ['render-failed']],
      ['alpha', []],
      ['zebra', ['insecure-url']],
      [null, []],
    ]);
    await expect(
      exportTemplates({ config, outDir: join(root, 'out') }),
    ).rejects.toThrow('Fixture exploded.');
  });

  it('reports malformed variants once and skips their untrusted names', async () => {
    loader.modules.set('a.email.tsx', {
      default: () => createElement('p'),
      previewVariants: ['not-an-object'],
    });
    const report = await checkTemplates({ config });
    expect(report.summary).toMatchObject({
      templates: 2,
      renders: 2,
      error: 1,
    });
    expect(report.results[0].findings[0]).toMatchObject({
      ruleId: 'render-failed',
      message: 'previewVariants must be a JSON object.',
    });
    expect(report.results[1].findings).toEqual([]);
  });

  it('requires explicit link-check configuration and validates overrides before loading', async () => {
    await expect(checkTemplates({ config, checkLinks: true })).rejects.toThrow(
      'requires linkCheck',
    );
    await expect(
      checkTemplates({ config, rules: { unknown: 'off' } }),
    ).rejects.toThrow('Unknown lint rule');
    expect(loader.close).not.toHaveBeenCalled();
  });

  it('never checks links without opt-in and passes effective overrides to the configured checker', async () => {
    config.linkCheck = { allowedHosts: ['example.org'] };
    await checkTemplates({ config, includeVariants: false });
    expect(network.create).not.toHaveBeenCalled();
    const report = await checkTemplates({
      config,
      includeVariants: false,
      checkLinks: true,
      rules: { 'link-redirect': 'info' },
    });
    expect(network.create).toHaveBeenCalledWith(
      expect.objectContaining({ allowedHosts: ['example.org'] }),
      expect.objectContaining({ 'link-redirect': 'info' }),
    );
    expect(report.summary.info).toBe(2);
    expect(report.results[0].findings[0].ruleId).toBe('link-redirect');
  });

  it('sorts findings by HTML source line instead of severity', async () => {
    const report = await checkTemplates({
      config: {
        ...config,
        renderer: {
          render: async () => ({
            html: '<img alt="Example" src="http://example.org/image.png">\n<img src="https://example.org/image.png">',
            text: 'Example',
          }),
        },
      },
      includeVariants: false,
    });
    expect(
      report.results[0].findings.map((finding) => [
        finding.line,
        finding.severity,
      ]),
    ).toEqual([
      [1, 'warning'],
      [2, 'error'],
    ]);
  });

  it('reports a module load failure without hiding later templates', async () => {
    loader.modules.delete('a.email.tsx');
    const report = await checkTemplates({ config });
    expect(report.results[0].findings[0]).toMatchObject({
      ruleId: 'render-failed',
      message: 'Module failed to load.',
    });
    expect(report.results[1].template.path).toBe('b.email.tsx');
    expect(loader.close).toHaveBeenCalledOnce();
  });

  it('formats readable text blocks with no ANSI escapes unless requested', async () => {
    const report = await checkTemplates({
      config,
      rules: { 'image-alt': 'off' },
    });
    expect(formatCheckReport(report)).toBe(
      'a.email.tsx  (zebra)\n  warning  insecure-url  HTML 1  Use an HTTPS URL to avoid blocked content and mixed-content warnings.\n\n2 templates, 4 renders · 0 errors · 1 warnings · 0 info\n',
    );
    expect(formatCheckReport(report, true)).toContain(
      '\u001b[33mwarning\u001b[0m',
    );
  });
});

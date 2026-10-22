import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import type { RegisteredTemplate } from './discovery.js';
import {
  normalizeJsonObject,
  renderTemplate,
  type TemplateModule,
} from './render-template.js';

describe('renderTemplate', () => {
  let directory: string;
  let template: RegisteredTemplate;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'chakra-email-render-'));
    const absolutePath = join(directory, 'welcome.tsx');
    await writeFile(absolutePath, 'export default function Welcome() {}\n');
    template = {
      absolutePath,
      id: 'opaque-id',
      name: 'Welcome',
      path: 'welcome.tsx',
    };
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  it('merges base, variant, and custom props and renders all output views', async () => {
    const Welcome = ({ count, name }: { count?: number; name?: string }) =>
      createElement('main', null, `Hello ${name} (${count})`);
    const module: TemplateModule = {
      default: Welcome,
      previewProps: { count: 1, name: 'Ada' },
      previewVariants: { friendly: { count: 2, name: 'Grace' } },
    };

    const result = await renderTemplate({
      module,
      props: { count: 3 },
      template,
      variant: 'friendly',
    });

    expect(result.props).toEqual({ count: 3, name: 'Grace' });
    expect(result.html).toContain('Hello Grace (3)');
    expect(result.lint.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        'content-type-meta',
        'document-body',
        'document-language',
        'viewport-meta',
      ]),
    );
    expect(result.text).toContain('Hello Grace (3)');
    expect(result.source).toContain('function Welcome');
    expect(result.subject).toBe('Welcome');
    expect(result.variants).toEqual(['friendly']);
    expect(Number.isInteger(result.renderMs)).toBe(true);
    expect(result.renderMs).toBeGreaterThanOrEqual(0);
    expect(result.rulesRun).toContain('plain-text-content');
    expect(result.rulesRun).not.toContain('link-broken');
  });

  it('merges nested variant diffs without losing fixture siblings or mutating inputs', async () => {
    const previewProps = {
      account: { name: 'Ada', details: { code: 'old', active: true } },
      items: [{ label: 'base' }],
      optional: { value: 'base' },
      scalar: 'base',
    };
    const previewVariants = {
      changed: {
        account: { details: { code: 'new' } },
        items: [{ label: 'variant' }],
        optional: null,
        scalar: { nested: true },
      },
    };
    const module = {
      default: () => createElement('p', null, 'Fixture'),
      previewProps,
      previewVariants,
    };
    const result = await renderTemplate({
      module,
      template,
      variant: 'changed',
    });
    expect(result.props).toEqual({
      account: { name: 'Ada', details: { code: 'new', active: true } },
      items: [{ label: 'variant' }],
      optional: null,
      scalar: { nested: true },
    });
    expect(previewProps.account.details.code).toBe('old');
    expect(previewVariants.changed.account).toEqual({
      details: { code: 'new' },
    });

    const edited = await renderTemplate({
      module,
      template,
      variant: 'changed',
      props: { account: { name: 'Grace' } },
    });
    expect(edited.props['account']).toEqual({ name: 'Grace' });
  });

  it('derives a subject from the fully merged preview props', async () => {
    const result = await renderTemplate({
      module: {
        default: ({ name }: { name?: string }) =>
          createElement('p', null, name),
        previewProps: { name: 'Ada' },
        previewSubject: async (props: Record<string, unknown>) =>
          `Welcome ${String(props['name'])}`,
      },
      props: { name: 'Grace' },
      template,
    });

    expect(result.subject).toBe('Welcome Grace');
  });

  it('exposes the configured sender and normalized hidden preview text', async () => {
    const result = await renderTemplate({
      template,
      previewFrom: { address: 'hello@example.org', name: 'Default sender' },
      module: { default: () => createElement('p') },
      renderer: {
        render: async () => ({
          html: '<body><div aria-hidden="true" style="display:none"> Hello &nbsp; world &zwnj;&nbsp; </div><p>Body</p></body>',
          text: 'Body',
        }),
      },
    });
    expect(result.from).toEqual({
      address: 'hello@example.org',
      name: 'Default sender',
    });
    expect(result.previewText).toBe('Hello world');
  });

  it.each([
    'Template <template@example.org>',
    async (props: Record<string, unknown>) =>
      `${String(props['name'])} <template@example.org>`,
  ])(
    'lets template sender metadata override config %#',
    async (previewFrom) => {
      const result = await renderTemplate({
        template,
        previewFrom: { address: 'config@example.org' },
        module: {
          default: () => createElement('p'),
          previewProps: { name: 'Base' },
          previewVariants: { named: { name: 'Variant' } },
          previewFrom,
        },
        variant: 'named',
        props: { name: 'Template' },
      });
      expect(result.from).toEqual({
        address: 'template@example.org',
        name: 'Template',
      });
    },
  );

  it.each([
    42,
    async () => 'a@example.org\r\nBcc: hidden@example.org',
    'not-an-address',
  ])('rejects invalid template sender metadata %#', async (previewFrom) => {
    await expect(
      renderTemplate({
        template,
        module: { default: () => createElement('p'), previewFrom },
      }),
    ).rejects.toThrow('previewFrom');
  });

  it('uses configured lint rules without changing rendered HTML or text', async () => {
    const module = {
      default: () =>
        createElement('img', { src: 'http://example.org/image.png' }),
    };
    const defaults = await renderTemplate({ module, template });
    const customized = await renderTemplate({
      module,
      template,
      lintRules: { 'image-alt': 'info', 'insecure-url': 'off' },
    });
    expect(customized.html).toBe(defaults.html);
    expect(customized.text).toBe(defaults.text);
    expect(
      defaults.lint.find((finding) => finding.ruleId === 'image-alt')?.severity,
    ).toBe('error');
    expect(
      customized.lint.find((finding) => finding.ruleId === 'image-alt')
        ?.severity,
    ).toBe('info');
    expect(
      customized.lint.some((finding) => finding.ruleId === 'insecure-url'),
    ).toBe(false);
  });

  it.each([
    ['', 'valid email subject'],
    ['Hello\r\nBcc: hidden@example.com', 'valid email subject'],
    ['é'.repeat(500), 'valid email subject'],
    [42, 'string or a function'],
  ])('rejects invalid preview subjects %#', async (previewSubject, message) => {
    await expect(
      renderTemplate({
        module: {
          default: () => createElement('p'),
          previewSubject,
        },
        template,
      }),
    ).rejects.toThrow(message);
  });

  it('supports React Email-style Component.PreviewProps', async () => {
    const Welcome = ({ name }: { name?: string }) =>
      createElement('p', null, name);
    Welcome.PreviewProps = { name: 'Lin' };

    const result = await renderTemplate({
      module: { default: Welcome },
      template,
    });
    expect(result.props).toEqual({ name: 'Lin' });
  });

  it('uses a configured renderer once for matching output', async () => {
    const renderer = {
      render: vi.fn(async () => ({
        html: '<main>Adapted HTML</main>',
        text: 'Adapted text',
      })),
    };

    const result = await renderTemplate({
      module: { default: () => createElement('main', null, 'Template') },
      renderer,
      template,
    });

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.render).toHaveBeenCalledWith(expect.anything(), {
      pretty: true,
    });
    expect(result.html).toBe('<main>Adapted HTML</main>');
    expect(result.text).toBe('Adapted text');
  });

  it('prefers named previewProps over Component.PreviewProps', async () => {
    const Welcome = ({ name }: { name?: string }) =>
      createElement('p', null, name);
    Welcome.PreviewProps = { name: 'Fallback' };
    const result = await renderTemplate({
      module: { default: Welcome, previewProps: { name: 'Named' } },
      template,
    });
    expect(result.props).toEqual({ name: 'Named' });
  });

  it.each([
    [{}, 'default export'],
    [{ default: 'not-a-component' }, 'React component'],
  ])('rejects invalid template modules', async (module, message) => {
    await expect(renderTemplate({ module, template })).rejects.toThrow(message);
  });

  it('rejects unknown variants and non-JSON props', async () => {
    const component = () => createElement('p');
    await expect(
      renderTemplate({
        module: { default: component, previewVariants: { valid: {} } },
        template,
        variant: 'missing',
      }),
    ).rejects.toThrow('Unknown preview variant');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => normalizeJsonObject(circular, 'props')).toThrow('circular');
    expect(() => normalizeJsonObject({ constructor: true }, 'props')).toThrow(
      'reserved key',
    );
  });
});

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
    expect(result.variants).toEqual(['friendly']);
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

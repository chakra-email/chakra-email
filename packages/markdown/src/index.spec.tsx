import {
  Button,
  EmailRenderError,
  render,
  Section,
  ThemeProvider,
} from '@chakra-email/core';
import { describe, expect, it } from 'vitest';
import type { ComponentType, ReactNode } from 'react';
import {
  createMarkdownDirectiveSupport,
  Markdown,
  type MarkdownDirectiveDefinition,
  type MarkdownDirectiveRegistry,
} from './index.js';

interface TestDirectiveNode {
  attributes?: Record<string, string | null | undefined>;
  children?: TestDirectiveNode[];
  data?: Record<string, unknown>;
  name?: string;
  type?: string;
}

function transformDirectives(
  registry: MarkdownDirectiveRegistry,
  tree: TestDirectiveNode,
): void {
  const support = createMarkdownDirectiveSupport(registry);
  const createTransformer = support.remarkPlugins[1] as unknown as () => (
    tree: TestDirectiveNode,
  ) => void;
  createTransformer()(tree);
}

const renderChildren = ({ children }: { children: ReactNode }) => children;

function invalidDefinition(
  definition: MarkdownDirectiveDefinition,
  reason: string,
): void {
  expect(() =>
    createMarkdownDirectiveSupport({ invalid: definition }),
  ).toThrowError(
    expect.objectContaining({
      code: 'INVALID_COMPONENT_PROP',
      details: { reason },
    }),
  );
}

describe('Markdown', () => {
  it('renders GFM through email-safe Chakra components', async () => {
    const html = await render(
      <Markdown>{`# Release notes

[Safe](https://example.com) [Relative](/missing)

| Name | Value |
| --- | --- |
| Ready | Yes |

\`\`\`ts
const ready = true;
\`\`\``}</Markdown>,
    );

    expect(html).toContain('<h1');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('href="/missing"');
    expect(html).toContain('data-text-format="dataTable"');
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('const ready = true;');
  });

  it('uses recipe overrides and component overrides', async () => {
    const html = await render(
      <ThemeProvider
        theme={{
          slotRecipes: {
            chakraEmailMarkdown: {
              slots: ['root', 'paragraph'],
              base: {
                root: { bg: '#ffffff', color: '#111111' },
                paragraph: { color: '#333333' },
              },
            },
          },
        }}
      >
        <Markdown
          components={{
            strong: ({ children }) => <b data-custom="true">{children}</b>,
          }}
        >
          {'A **custom** paragraph.'}
        </Markdown>
      </ThemeProvider>,
    );

    expect(html).toContain('background-color:#ffffff');
    expect(html).toContain('color:#333333');
    expect(html).toContain('data-custom="true"');
  });

  it('can disable GFM parsing', async () => {
    const html = await render(<Markdown gfm={false}>{'~~kept~~'}</Markdown>);
    expect(html).toContain('~~kept~~');
    expect(html).not.toContain('<del>');
  });

  it('maps the complete document surface and forwards code options', async () => {
    const html = await render(
      <Markdown
        codeBlockLineNumbers
        codeBlockProps={{ variant: 'outline' }}
        codeHighlighter={(code) => [
          [{ content: code, style: { color: '#0550ae' } }],
        ]}
        remarkPlugins={[() => undefined]}
      >{`## Two
### Three
#### Four
##### Five
###### Six

> Quoted paragraph

Use \`inline code\` here.

---

- Unordered

1. Ordered

![Logo](https://example.com/logo.png "Example logo")

\`\`\`
plain block
\`\`\`

\`\`\`ts
const highlighted = true;
\`\`\``}</Markdown>,
    );

    expect(html).toContain('<h2');
    expect(html).toContain('<h6');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<code');
    expect(html).toContain('<hr');
    expect(html).toContain('<ul');
    expect(html).toContain('<ol');
    expect(html).toContain('src="https://example.com/logo.png"');
    expect(html).toContain('title="Example logo"');
    expect(html).toContain('<pre');
    expect(html).toContain('plain block');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('color:#0550ae');
  });

  it('enforces source byte and line limits before parsing', async () => {
    await expect(
      render(<Markdown limits={{ maxSourceBytes: 3 }}>{'éé'}</Markdown>),
    ).rejects.toMatchObject({ code: 'SOURCE_TOO_LARGE' });
    await expect(
      render(<Markdown limits={{ maxLines: 2 }}>{'one\ntwo\nthree'}</Markdown>),
    ).rejects.toMatchObject({ code: 'SOURCE_TOO_LARGE' });
  });

  it('bounds parsed node count and nesting depth', async () => {
    await expect(
      render(<Markdown limits={{ maxAstNodes: 3 }}>{'One\n\nTwo'}</Markdown>),
    ).rejects.toMatchObject({ code: 'AST_TOO_LARGE' });
    await expect(
      render(
        <Markdown limits={{ maxNestingDepth: 3 }}>{'> > > > Nested'}</Markdown>,
      ),
    ).rejects.toMatchObject({ code: 'NESTING_TOO_DEEP' });
  });

  it('offers strict limits and typed configuration errors', async () => {
    const html = await render(<Markdown limits="strict">{'Safe'}</Markdown>);
    expect(html).toContain('Safe');
    await expect(
      render(<Markdown limits={{ maxLines: 1 }}>{''}</Markdown>),
    ).resolves.toContain('<div');

    await expect(
      render(<Markdown limits={{ maxLines: 0 }}>{'Unsafe'}</Markdown>),
    ).rejects.toBeInstanceOf(EmailRenderError);
  });

  it('renders schema-validated leaf and container directives', async () => {
    const html = await render(
      <Markdown
        directives={{
          button: {
            kind: 'leaf',
            children: 'required',
            attributes: {
              href: { type: 'url', required: true },
              variant: {
                type: 'enum',
                values: ['primary', 'secondary'],
              },
            },
            render: ({ attributes, children }) => (
              <Button href={String(attributes.href)}>{children}</Button>
            ),
          },
          callout: {
            kind: 'container',
            children: 'required',
            attributes: {
              tone: { type: 'enum', values: ['info', 'warning'] },
            },
            render: ({ attributes, children }) => (
              <Section data-tone={attributes.tone}>{children}</Section>
            ),
          },
        }}
      >{`::button[Review account]{href="https://example.com/review" variant="primary"}

:::callout{tone="warning"}
Renew soon.
:::`}</Markdown>,
    );

    expect(html).toContain('href="https://example.com/review"');
    expect(html).toContain('Review account');
    expect(html).toContain('data-tone="warning"');
    expect(html).toContain('Renew soon.');
  });

  it('keeps directive syntax inert unless a trusted registry is supplied', async () => {
    const html = await render(
      <Markdown>{'::button[Review]{href="javascript:alert(1)"}'}</Markdown>,
    );

    expect(html).toContain('::button');
    expect(html).not.toContain('<a');
  });

  it('fails closed for unsafe URLs and undeclared directive input', async () => {
    const button = {
      kind: 'leaf' as const,
      children: 'required' as const,
      attributes: {
        href: { type: 'url' as const, required: true },
      },
      render: ({ children }: { children: React.ReactNode }) => children,
    };

    await expect(
      render(
        <Markdown directives={{ button }}>
          {'::button[Unsafe]{href="javascript:alert(1)"}'}
        </Markdown>,
      ),
    ).rejects.toMatchObject({ code: 'UNSAFE_URL' });
    await expect(
      render(
        <Markdown directives={{ button }}>
          {'::button[Unknown]{href="https://example.com" tone="warning"}'}
        </Markdown>,
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_COMPONENT_PROP',
      details: { reason: 'unknown-attribute' },
    });
    await expect(
      render(
        <Markdown directives={{ button }}>
          {'::callout[Unknown]{href="https://example.com"}'}
        </Markdown>,
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_COMPONENT_PROP',
      details: { reason: 'unknown-directive' },
    });
  });

  it('supports every declarative attribute type and boolean spelling', () => {
    const registry: MarkdownDirectiveRegistry = {
      action: {
        kind: 'leaf',
        attributes: {
          enabled: { type: 'boolean' },
          href: { type: 'url' },
          image: { type: 'url', kind: 'image' },
          label: { type: 'string', maxBytes: 8 },
          tone: { type: 'enum', values: ['info', 'warning'] },
        },
        render: renderChildren,
      },
      empty: { kind: 'leaf', render: renderChildren },
    };
    const action: TestDirectiveNode = {
      type: 'leafDirective',
      name: 'action',
      attributes: {
        enabled: null,
        href: 'https://example.com/action',
        image: 'https://example.com/image.png',
        label: 'Ready',
        tone: 'info',
      },
      data: { existing: true },
    };
    const empty: TestDirectiveNode = {
      type: 'leafDirective',
      name: 'empty',
    };

    transformDirectives(registry, { children: [action, empty] });

    expect(action.data).toMatchObject({
      existing: true,
      hName: 'chakra-email-directive',
    });
    expect(action.data?.['hProperties']).toMatchObject({
      directiveName: 'action',
      directiveAttributes: JSON.stringify({
        enabled: true,
        href: 'https://example.com/action',
        image: 'https://example.com/image.png',
        label: 'Ready',
        tone: 'info',
      }),
    });
    expect(empty.data).toMatchObject({
      hName: 'chakra-email-directive',
      hProperties: { directiveAttributes: '{}' },
    });

    for (const [value, expected] of [
      ['', true],
      ['true', true],
      ['false', false],
    ] as const) {
      const node: TestDirectiveNode = {
        type: 'leafDirective',
        name: 'action',
        attributes: { enabled: value },
      };
      transformDirectives(registry, node);
      expect(node.data?.['hProperties']).toMatchObject({
        directiveAttributes: JSON.stringify({ enabled: expected }),
      });
    }
  });

  it('rejects malformed directive registry definitions', () => {
    invalidDefinition(
      {
        kind: 'invalid',
        render: renderChildren,
      } as MarkdownDirectiveDefinition,
      'invalid-kind-configuration',
    );
    invalidDefinition(
      {
        kind: 'leaf',
        children: 'invalid',
        render: renderChildren,
      } as MarkdownDirectiveDefinition,
      'invalid-children-configuration',
    );
    invalidDefinition(
      {
        kind: 'leaf',
        attributes: { label: { type: 'string', maxBytes: 0 } },
        render: renderChildren,
      },
      'invalid-string-limit',
    );
    invalidDefinition(
      {
        kind: 'leaf',
        attributes: { label: { type: 'string', maxBytes: 1.5 } },
        render: renderChildren,
      },
      'invalid-string-limit',
    );
    invalidDefinition(
      {
        kind: 'leaf',
        attributes: { tone: { type: 'enum', values: [] } },
        render: renderChildren,
      },
      'invalid-enum-configuration',
    );
    invalidDefinition(
      {
        kind: 'leaf',
        attributes: { tone: { type: 'enum', values: [''] } },
        render: renderChildren,
      },
      'invalid-enum-configuration',
    );
    invalidDefinition(
      {
        kind: 'leaf',
        attributes: { value: { type: 'number' } },
        render: renderChildren,
      } as unknown as MarkdownDirectiveDefinition,
      'invalid-attribute-configuration',
    );
  });

  it('fails closed for every invalid directive shape and attribute value', () => {
    const registry: MarkdownDirectiveRegistry = {
      action: {
        kind: 'leaf',
        children: 'required',
        attributes: {
          enabled: { type: 'boolean' },
          href: { type: 'url', required: true },
          label: { type: 'string', maxBytes: 4 },
          tone: { type: 'enum', values: ['info'] },
        },
        render: renderChildren,
      },
      empty: {
        kind: 'leaf',
        children: 'none',
        render: renderChildren,
      },
    };
    const expectFailure = (node: TestDirectiveNode, reason: string) => {
      expect(() => transformDirectives(registry, node)).toThrowError(
        expect.objectContaining({
          code: 'INVALID_COMPONENT_PROP',
          details: { reason },
        }),
      );
    };
    const action = (
      attributes?: TestDirectiveNode['attributes'],
    ): TestDirectiveNode => ({
      type: 'leafDirective',
      name: 'action',
      attributes,
      children: [{}],
    });

    expectFailure(
      { type: 'leafDirective', name: 'missing' },
      'unknown-directive',
    );
    expectFailure({ type: 'leafDirective' }, 'unknown-directive');
    expectFailure(
      { type: 'textDirective', name: 'action' },
      'unexpected-directive-kind',
    );
    expectFailure(
      { type: 'leafDirective', name: 'empty', children: [{}] },
      'children-not-allowed',
    );
    expectFailure(
      { type: 'leafDirective', name: 'action' },
      'children-required',
    );
    expectFailure(
      action({ href: 'https://example.com', unknown: 'value' }),
      'unknown-attribute',
    );
    expectFailure(action(), 'missing-required-attribute');
    expectFailure(action({ href: null }), 'missing-attribute-value');
    expectFailure(
      action({ enabled: 'sometimes', href: 'https://example.com' }),
      'invalid-boolean',
    );
    expectFailure(
      action({ href: 'https://example.com', tone: 'warning' }),
      'invalid-enum-value',
    );
    expectFailure(
      action({ href: 'https://example.com', label: 'ééé' }),
      'attribute-too-large',
    );
  });

  it('rejects impossible directive render states', async () => {
    const support = createMarkdownDirectiveSupport({
      action: { kind: 'leaf', render: renderChildren },
    });
    const Directive = support.components[
      'chakra-email-directive'
    ] as ComponentType<{
      directiveAttributes?: string;
      directiveName?: string;
    }>;

    await expect(
      render(<Directive directiveAttributes="{}" directiveName="missing" />),
    ).rejects.toMatchObject({
      code: 'INVALID_COMPONENT_PROP',
      details: { reason: 'invalid-render-state' },
    });
    await expect(
      render(<Directive directiveAttributes="{}" />),
    ).rejects.toMatchObject({
      code: 'INVALID_COMPONENT_PROP',
      details: { reason: 'invalid-render-state' },
    });
    await expect(
      render(<Directive directiveName="action" />),
    ).rejects.toMatchObject({
      code: 'INVALID_COMPONENT_PROP',
      details: { reason: 'invalid-render-state' },
    });
  });
});

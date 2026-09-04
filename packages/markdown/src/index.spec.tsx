import {
  Button,
  EmailRenderError,
  render,
  Section,
  ThemeProvider,
} from '@chakra-email/core';
import { describe, expect, it } from 'vitest';
import { Markdown } from './index.js';

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
});

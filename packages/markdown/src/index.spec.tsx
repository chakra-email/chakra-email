import { render, ThemeProvider } from '@chakra-email/core';
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
});

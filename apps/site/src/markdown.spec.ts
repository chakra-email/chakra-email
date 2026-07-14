import { describe, expect, it } from 'vitest';
import { escapeHtml, renderMarkdown } from './markdown';

describe('documentation markdown rendering', () => {
  it('escapes raw markup and prefixes heading ids per page', () => {
    const html = renderMarkdown(
      '# Getting Started\n\nHello <script>alert(1)</script>.',
      {
        headingIdPrefix: 'getting-started',
      },
    );

    expect(html).toContain(
      '<h1 id="getting-started-getting-started">Getting Started</h1>',
    );
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('maps markdown documents and fragments to namespaced site anchors', () => {
    const html = renderMarkdown(
      '[v2](./chakra-v2.md) [API](../components.md#Table Components)',
    );

    expect(html).toContain('href="#chakra-v2"');
    expect(html).toContain('href="#components-table-components"');
  });

  it('maps same-page fragments to the page heading namespace', () => {
    const html = renderMarkdown('## Install\n\n[Jump to install](#install)', {
      headingIdPrefix: 'getting-started',
    });

    expect(html).toContain('id="getting-started-install"');
    expect(html).toContain('href="#getting-started-install"');
  });

  it('does not rewrite absolute or protocol-relative markdown URLs', () => {
    const html = renderMarkdown(
      '[web](https://example.com/guide.md) [cdn](//example.com/guide.md) [mail](mailto:guide.md)',
    );

    expect(html).toContain('href="https://example.com/guide.md"');
    expect(html).toContain('href="//example.com/guide.md"');
    expect(html).toContain('href="mailto:guide.md"');
  });

  it('allows normal navigation schemes and blocks executable schemes', () => {
    const html = renderMarkdown(
      '[web](https://example.com) [mail](mailto:hello@example.com) [bad](javascript:alert(1))',
    );

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="mailto:hello@example.com"');
    expect(html).toContain('<a href="#">bad</a>');
    expect(html).not.toContain('javascript:');
  });

  it('escapes query-string separators exactly once', () => {
    const html = renderMarkdown('[query](https://example.com?a=1&b=2)');

    expect(html).toContain('href="https://example.com?a=1&amp;b=2"');
    expect(html).not.toContain('&amp;amp;');
  });

  it('escapes attribute delimiters', () => {
    expect(escapeHtml('"<tag>" & \'text\'')).toBe(
      '&quot;&lt;tag&gt;&quot; &amp; &#39;text&#39;',
    );
  });

  it('renders code fences, lists, quotes, and continued paragraphs', () => {
    const html = renderMarkdown(`
## Syntax

\`\`\`tsx
const element = <Email />;
\`\`\`

- first **item**
* second \`item\`

1. one
2. two

> quoted line
> with **emphasis**

A paragraph
continued on the next line.
    `);

    expect(html).toContain('<h2 id="syntax">Syntax</h2>');
    expect(html).toContain(
      '<code data-language="tsx">const element = &lt;Email /&gt;;</code>',
    );
    expect(html).toContain(
      '<ul><li>first <strong>item</strong></li><li>second <code>item</code></li></ul>',
    );
    expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
    expect(html).toContain(
      '<blockquote>quoted line with <strong>emphasis</strong></blockquote>',
    );
    expect(html).toContain('<p>A paragraph continued on the next line.</p>');
  });

  it('renders markdown tables and inline formatting safely', () => {
    const html = renderMarkdown(`
| Component | Purpose |
| :-- | --: |
| **Button** | Calls to \`action\` |
| Link | [Docs](https://example.com/docs) |
    `);

    expect(html).toContain(
      '<thead><tr><th>Component</th><th>Purpose</th></tr></thead>',
    );
    expect(html).toContain(
      '<td><strong>Button</strong></td><td>Calls to <code>action</code></td>',
    );
    expect(html).toContain(
      '<td>Link</td><td><a href="https://example.com/docs">Docs</a></td>',
    );
  });

  it('keeps ordinary relative links and rejects obfuscated active content', () => {
    const html = renderMarkdown(
      '[relative](guide/page) [phone](tel:+15551212) [bad](java\tscript:alert(1))',
    );

    expect(html).toContain('href="guide/page"');
    expect(html).toContain('href="tel:+15551212"');
    expect(html).toContain('<a href="#">bad</a>');
    expect(html).not.toContain('java\tscript:');
  });
});

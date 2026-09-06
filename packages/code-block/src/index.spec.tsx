import { render, renderEmail, ThemeProvider } from '@chakra-email/core';
import { describe, expect, it } from 'vitest';
import { CodeBlock, plainTextHighlighter } from './index.js';

describe('CodeBlock', () => {
  it('preserves dark slot styles while static highlighter colors remain unchanged', async () => {
    const html = await render(
      <ThemeProvider
        theme={{
          slotRecipes: {
            chakraEmailCodeBlock: {
              slots: ['root', 'lineNumber', 'token'],
              base: {
                root: { _dark: { bg: '#123456' } },
                lineNumber: { _dark: { color: '#abcdef' } },
                token: { _dark: { color: '#fedcba' } },
              },
            },
          },
        }}
      >
        <CodeBlock
          className="user-code"
          code="value"
          lineNumbers
          highlighter={() => [
            [{ content: 'value', style: { color: '#111111' } }],
          ]}
        />
      </ThemeProvider>,
    );
    expect(html).toContain('user-code ce-mode-');
    expect(html).toContain('background-color: #123456 !important');
    expect(html).toContain('color: #abcdef !important');
    expect(html).not.toContain('color: #fedcba !important');
    expect(html).toContain('color:#111111');
  });
  it('renders plain code and optional line numbers', async () => {
    const { html, text } = await renderEmail(
      <CodeBlock code={'const answer = 42;\nreturn answer;'} lineNumbers />,
    );

    expect(html).toContain('<pre');
    expect(html).toContain('const answer = 42;');
    expect(html).toContain('return answer;');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('>1</span>');
    expect(html).toContain('>2</span>');
    expect(text).toBe('const answer = 42;\nreturn answer;');
  });

  it('accepts a synchronous highlighter and filters browser-only styles', async () => {
    const html = await render(
      <CodeBlock
        code="const"
        language="typescript"
        highlighter={() => [
          [
            {
              content: 'const',
              style: { color: '#b42318', transform: 'scale(2)' },
            },
          ],
        ]}
      />,
    );

    expect(html).toContain('data-language="typescript"');
    expect(html).toContain('color:#b42318');
    expect(html).not.toContain('transform');
  });

  it('uses theme-level slot recipe overrides', async () => {
    const html = await render(
      <ThemeProvider
        theme={{
          slotRecipes: {
            chakraEmailCodeBlock: {
              slots: ['root', 'lineNumber'],
              base: {
                root: { bg: '#ffffff', color: '#111111' },
                lineNumber: { color: '#555555' },
              },
            },
          },
        }}
      >
        <CodeBlock code="value" lineNumbers />
      </ThemeProvider>,
    );

    expect(html).toContain('background-color:#ffffff');
    expect(html).toContain('color:#111111');
    expect(html).toContain('color:#555555');
  });

  it('exports a stable plain-text highlighter', () => {
    expect(plainTextHighlighter('one\ntwo', 'text')).toEqual([
      [{ content: 'one' }],
      [{ content: 'two' }],
    ]);
  });
});

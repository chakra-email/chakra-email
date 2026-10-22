# Code Blocks

Use `@chakra-email/code-block` to render themeable code blocks inside email
templates. The default renderer displays plain code without a syntax-highlighting
dependency. Add a synchronous highlighter adapter when you need syntax colors.

## Install

```bash
npm install @chakra-email/code-block
```

The package supports React 18 and 19 and uses the same theme context as the rest
of Chakra Email.

## Render a code block

```tsx
import { CodeBlock } from '@chakra-email/code-block';
import { renderEmail } from 'chakra-email';

const { html, text } = await renderEmail(
  <CodeBlock
    code={'const ready = true;\nconsole.log(ready);'}
    language="typescript"
    lineNumbers
    size="md"
    variant="subtle"
  />,
);
```

`code` is required. `language` labels the block and is passed to the highlighter;
it does not enable highlighting by itself. `lineNumbers` defaults to `false`.
Line numbers are hidden from assistive technology and omitted from the generated
plain-text email, leaving just the code.

The built-in sizes are `sm`, `md`, and `lg`; variants are `subtle`, `outline`, and
`plain`. Chakra-style props such as `p`, `bg`, and `color` customize the outer
`pre` element.

## Syntax highlighting

A `CodeHighlighter` receives the source code and optional language and returns
an array of lines, each containing tokens with `content` and optional React
`CSSProperties` styles. Return token text, not HTML strings. React escapes that
text, and Chakra Email filters token styles for email compatibility.

This minimal adapter applies a single color to each line. Replace it with tokens
from Prism, Shiki, or another syntax engine for language-aware highlighting:

```tsx
import { CodeBlock, type CodeHighlighter } from '@chakra-email/code-block';

const highlighter: CodeHighlighter = (code, language) =>
  code.split(/\r\n|\r|\n/).map((line) => [
    {
      content: line,
      style: { color: language === 'typescript' ? '#0550ae' : '#24292f' },
    },
  ]);

export function CodeSample() {
  return (
    <CodeBlock
      code="const ready = true;"
      language="typescript"
      highlighter={highlighter}
    />
  );
}
```

The adapter must be synchronous. If your syntax engine needs asynchronous
initialization, initialize it before rendering the email. Preserve all source
text and line boundaries in its token output. `plainTextHighlighter` is also
exported for adapters that need an unhighlighted fallback.

## Theme the slots

Customize `root`, `code`, `line`, `lineNumber`, and `token` through the
`chakraEmailCodeBlock` slot recipe:

```tsx
import { CodeBlock } from '@chakra-email/code-block';
import { ChakraEmailProvider } from 'chakra-email/theme';

const theme = {
  slotRecipes: {
    chakraEmailCodeBlock: {
      slots: ['root', 'code', 'line', 'lineNumber', 'token'],
      base: {
        root: { bg: '#f6f8fa', color: '#24292f', p: 4, rounded: 'md' },
        lineNumber: { color: '#57606a' },
      },
    },
  },
};

export function CodeSample() {
  return (
    <ChakraEmailProvider theme={theme}>
      <CodeBlock code={'first line\nsecond line'} lineNumbers />
    </ChakraEmailProvider>
  );
}
```

Explicit highlighter token styles override the corresponding token recipe
styles. Fixed syntax colors do not automatically adapt to dark mode, so choose
readable foreground and background combinations and test your target email
clients. See [Theming](./theming.md) for recipes and color modes, and
[Markdown](./markdown.md) for fenced code in Markdown bodies.

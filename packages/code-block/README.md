# @chakra-email/code-block

Themeable, email-safe code blocks for Chakra Email. The default renderer is dependency-free and displays plain code; pass a synchronous highlighter adapter when syntax colors are needed.

[Documentation](https://chakra.email/docs/code-block) · [Getting started](https://chakra.email/docs/getting-started) · [Examples](https://chakra.email/examples) · [Issues](https://github.com/chakra-email/chakra-email/issues)

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

## Install

```bash
npm install @chakra-email/code-block chakra-email react react-dom
```

This example uses `chakra-email` for the document shell and renderer. Chakra UI
itself is not required.

> [!NOTE]
> ESM-only. Published packages support React 18/19 and Node.js 20.19.0 or newer;
> Node.js 24 is recommended. This repository's contributor tooling uses Node.js
> 24 and pnpm.

## Quick start

<!-- quickstart:start -->

```tsx
import { CodeBlock } from '@chakra-email/code-block';
import { Body, Head, Html, renderEmail } from 'chakra-email';

export async function renderWelcomeEmail() {
  return renderEmail(
    <Html>
      <Head>
        <title>Your first code example</title>
      </Head>
      <Body>
        <CodeBlock code="const ready = true;" language="ts" lineNumbers />
      </Body>
    </Html>,
  );
}
```

<!-- quickstart:end -->

Call `await renderWelcomeEmail()` to receive `{ html, text }` for your delivery
provider. Rendering does not send mail or require provider credentials.

## Optional highlighting

Plain code needs no syntax-highlighting dependency. Supply a synchronous
`CodeHighlighter` to add colors; this minimal adapter colors the entire source
and can be replaced with tokens from your preferred syntax engine:

```tsx
import { CodeBlock, type CodeHighlighter } from '@chakra-email/code-block';

const highlighter: CodeHighlighter = (code, language) =>
  code.split('\n').map((line) => [
    {
      content: line,
      style: { color: language === 'ts' ? '#0550ae' : undefined },
    },
  ]);

<CodeBlock
  code="const ready = true;"
  language="ts"
  lineNumbers
  highlighter={highlighter}
/>;
```

Customize `root`, `code`, `line`, `lineNumber`, and `token` through the `chakraEmailCodeBlock` slot recipe. The recipe supports `size` (`sm`, `md`, `lg`) and `variant` (`subtle`, `outline`, `plain`).

## Help and contributing

Read the [Code Blocks guide](https://chakra.email/docs/code-block), [open an issue](https://github.com/chakra-email/chakra-email/issues), or see the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## License

MIT

# @chakra-email/code-block

Themeable, email-safe code blocks for Chakra Email. The default renderer is dependency-free and displays plain code; pass a synchronous highlighter adapter when syntax colors are needed.

```tsx
import { CodeBlock, type CodeHighlighter } from '@chakra-email/code-block';

const highlighter: CodeHighlighter = (code, language) => [
  [
    {
      content: code,
      style: { color: language === 'ts' ? '#0550ae' : undefined },
    },
  ],
];

<CodeBlock
  code="const ready = true;"
  language="ts"
  lineNumbers
  highlighter={highlighter}
/>;
```

Customize `root`, `code`, `line`, `lineNumber`, and `token` through the `chakraEmailCodeBlock` slot recipe. The recipe supports `size` (`sm`, `md`, `lg`) and `variant` (`subtle`, `outline`, `plain`).

## License

MIT

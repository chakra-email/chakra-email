# @chakra-email/markdown

Email-safe Markdown rendering for Chakra Email. GitHub Flavored Markdown is enabled by default, including tables, task lists, strikethrough, and autolinks.

```tsx
import { Markdown } from '@chakra-email/markdown';

<Markdown codeBlockLineNumbers>{markdownSource}</Markdown>;
```

The default component map uses Chakra Email headings, text, links, images, lists, tables, quotes, inline code, and `@chakra-email/code-block` for fenced code with a language. Pass `components` to override individual nodes and `remarkPlugins` to extend parsing.

Customize `root`, `heading`, `paragraph`, `link`, `blockquote`, `list`, `listItem`, `code`, `pre`, `hr`, `table`, `tableHeader`, `tableCell`, and `image` through the `chakraEmailMarkdown` slot recipe.

Relative URLs are intentionally omitted from delivered email markup. Resolve content URLs against a public base before rendering.

## License

MIT

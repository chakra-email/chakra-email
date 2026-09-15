# @chakra-email/markdown

Email-safe Markdown rendering for Chakra Email. GitHub Flavored Markdown is enabled by default, including tables, task lists, strikethrough, and autolinks.

```tsx
import { Markdown } from '@chakra-email/markdown';

<Markdown codeBlockLineNumbers>{markdownSource}</Markdown>;
```

The default component map uses Chakra Email headings, text, links, images, lists, tables, quotes, inline code, and `@chakra-email/code-block` for fenced code with a language. Pass `components` to override individual nodes and `remarkPlugins` to extend parsing.

Customize `root`, `heading`, `paragraph`, `link`, `blockquote`, `list`, `listItem`, `code`, `pre`, `hr`, `table`, `tableHeader`, `tableCell`, and `image` through the `chakraEmailMarkdown` slot recipe.

Relative URLs are intentionally omitted from delivered email markup. Resolve content URLs against a public base before rendering.

## Bounded untrusted input

Admission controls are opt-in so trusted, existing templates are not assigned
an arbitrary content ceiling. Use the strict preset for tenant-authored input:

```tsx
<Markdown limits="strict">{markdownSource}</Markdown>
```

The strict preset allows at most 256 KiB of UTF-8 source, 10,000 lines, 5,000
AST nodes, and eight levels of syntax-tree nesting. Pass a `limits` object to
set only the boundaries your application needs. Final HTML and text limits are
configured separately on `renderEmail`.

## Safe directives

Add controlled constructs without enabling MDX or executing source code:

```tsx
import { Button, Section } from 'chakra-email';

<Markdown
  directives={{
    button: {
      kind: 'leaf',
      children: 'required',
      attributes: {
        href: { type: 'url', required: true },
        variant: { type: 'enum', values: ['primary', 'secondary'] },
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
      render: ({ children }) => <Section>{children}</Section>,
    },
  }}
>
  {markdownSource}
</Markdown>;
```

The content may then use
`::button[Review]{href="https://example.com" variant="primary"}` or a
`:::callout{tone="warning"}` container. The registry is trusted application
code. Source directives are inert without it; unknown directives, attributes,
invalid enums, unsafe URLs, and invalid child shapes fail closed. String
attributes require an explicit UTF-8 byte limit.

## License

MIT

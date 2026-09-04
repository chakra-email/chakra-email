# Markdown

Chakra Email keeps markdown parsing out of its core runtime. Install the optional adapter for a ready-to-use, email-safe GFM mapping:

```bash
npm install @chakra-email/markdown
```

```tsx
import { Markdown } from '@chakra-email/markdown';

export function MarkdownBody({ markdown }: { markdown: string }) {
  return <Markdown codeBlockLineNumbers>{markdown}</Markdown>;
}
```

Use the `chakraEmailMarkdown` slot recipe to customize document elements and `chakraEmailCodeBlock` to customize fenced code. CodeBlock also accepts a synchronous `highlighter` adapter, keeping Prism, Shiki, or another syntax engine optional.

For complete control, use the markdown parser you prefer and map markdown elements to Chakra Email components yourself.

This package split keeps the core package small and avoids forcing a markdown AST dependency on users who write templates directly in JSX.

## Admission limits

For tenant-authored or otherwise untrusted Markdown, opt into bounded parsing:

```tsx
<Markdown limits="strict">{markdown}</Markdown>
```

`strictMarkdownLimits` caps UTF-8 source bytes, lines, AST nodes, and nesting
depth at 256 KiB, 10,000, 5,000, and 8 respectively. A partial object customizes
individual boundaries. Pair this with `strictEmailOutputLimits` on
`renderEmail()` to cap the final HTML and plain-text bodies.

Limits throw content-free `EmailRenderError` values with `SOURCE_TOO_LARGE`,
`AST_TOO_LARGE`, `NESTING_TOO_DEEP`, or `OUTPUT_TOO_LARGE` codes.

## Declarative components

Use a trusted directive registry for a small, schema-controlled component
vocabulary. This is intentionally not MDX: Markdown cannot import components,
evaluate expressions, or run JavaScript.

```tsx
import { Button, Section } from 'chakra-email';
import {
  Markdown,
  type MarkdownDirectiveRegistry,
} from '@chakra-email/markdown';

const directives = {
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
} satisfies MarkdownDirectiveRegistry;

export function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <Markdown directives={directives} limits="strict">
      {markdown}
    </Markdown>
  );
}
```

Supported attribute schemas are `boolean`, `enum`, bounded `string`, and `url`.
URL attributes use Chakra Email's strict URL policy. Unknown syntax and schema
violations fail closed once a registry is enabled; without a registry,
directive syntax remains ordinary inert Markdown text.

## Custom React Markdown Example

```bash
npm install react-markdown
```

```tsx
import ReactMarkdown, { type Components } from 'react-markdown';
import {
  Blockquote,
  Code,
  Heading,
  Hr,
  Img,
  Link,
  List,
  ListItem,
  Pre,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from 'chakra-email';

// Use the stable public directory where Markdown-linked pages and assets live.
const markdownPublicBaseUrl = new URL('https://example.com/content/');

function resolveMarkdownUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith('#')) {
    return normalized;
  }

  try {
    return new URL(normalized, markdownPublicBaseUrl).href;
  } catch {
    return undefined;
  }
}

const components: Components = {
  p: ({ children }) => <Text>{children}</Text>,
  h1: ({ children }) => <Heading as="h1">{children}</Heading>,
  h2: ({ children }) => <Heading as="h2">{children}</Heading>,
  a: ({ href, children }) => {
    const resolvedHref = resolveMarkdownUrl(href);

    return resolvedHref ? (
      <Link href={resolvedHref}>{children}</Link>
    ) : (
      <>{children}</>
    );
  },
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  code: ({ children }) => <Code>{children}</Code>,
  pre: ({ children }) => <Pre>{children}</Pre>,
  ul: ({ children }) => <List>{children}</List>,
  ol: ({ children }) => <List as="ol">{children}</List>,
  li: ({ children }) => <ListItem>{children}</ListItem>,
  img: ({ src, alt }) => {
    const resolvedSrc = resolveMarkdownUrl(src);

    return resolvedSrc ? <Img src={resolvedSrc} alt={alt ?? ''} /> : null;
  },
  hr: () => <Hr />,
  table: ({ children }) => <Table>{children}</Table>,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableHeader>{children}</TableHeader>,
  td: ({ children }) => <TableCell>{children}</TableCell>,
};

export function MarkdownBody({ markdown }: { markdown: string }) {
  return <ReactMarkdown components={components}>{markdown}</ReactMarkdown>;
}
```

## URL Portability

Delivered email has no sender-controlled document base. A relative path such as
`../account`, `/help`, or `images/logo.png` may otherwise be resolved against a
webmail application's own origin or discarded by the client. Choose a stable,
public base URL for each Markdown content source and resolve relative links and
images before handing them to Chakra Email, as the example above does.
Resolution establishes an origin for relative content; the component protocol
allowlists still provide the final output safeguard.

The component URL policy is deliberately narrow:

- `Link` and `Button` allow absolute `http:` and `https:` URLs, `mailto:` and
  `tel:` actions, and `#fragment` destinations.
- `Img` allows absolute `http:` and `https:` URLs and `cid:` references for MIME
  attachments.
- Relative, protocol-relative, empty, malformed, and unsupported component
  URLs are omitted. The components do not infer a deployment host.

If you use `cid:`, make sure the sending provider attaches a MIME part whose
`Content-ID` matches the rendered value. Prefer HTTPS for remotely hosted
assets, and verify that recipients can access them without authentication.

## Recommended Email Structure

Render markdown inside your content container, not as the full document.

```tsx
<Html>
  <Head />
  <Body bg="gray.50">
    <Container bg="white" p={6}>
      <MarkdownBody markdown={bodyMarkdown} />
    </Container>
  </Body>
</Html>
```

This lets your application keep consistent headers, footers, tracking links, and layout around the markdown body.

## Raw HTML

Keep raw HTML disabled unless your pipeline sanitizes it before rendering. Raw HTML can bypass the email-safe component layer and introduce unsupported email styles or unsafe markup.

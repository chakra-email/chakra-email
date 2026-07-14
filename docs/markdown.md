# Markdown

Chakra Email does not bundle a markdown parser. Instead, use the markdown parser you prefer and map markdown elements to Chakra Email components.

This keeps the core package small and avoids forcing a markdown AST dependency on users who write templates directly in JSX.

## React Markdown Example

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

const components: Components = {
  p: ({ children }) => <Text>{children}</Text>,
  h1: ({ children }) => <Heading as="h1">{children}</Heading>,
  h2: ({ children }) => <Heading as="h2">{children}</Heading>,
  a: ({ href, children }) => <Link href={href ?? '#'}>{children}</Link>,
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  code: ({ children }) => <Code>{children}</Code>,
  pre: ({ children }) => <Pre>{children}</Pre>,
  ul: ({ children }) => <List>{children}</List>,
  ol: ({ children }) => <List as="ol">{children}</List>,
  li: ({ children }) => <ListItem>{children}</ListItem>,
  img: ({ src, alt }) => <Img src={src ?? ''} alt={alt ?? ''} />,
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

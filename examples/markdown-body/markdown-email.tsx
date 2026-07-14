import ReactMarkdown, { type Components } from 'react-markdown';
import {
  Blockquote,
  Body,
  ChakraEmailProvider,
  Code,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  List,
  ListItem,
  Pre,
  Preview,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  render,
} from 'chakra-email';

const markdownComponents: Components = {
  p: ({ children }) => <Text>{children}</Text>,
  h1: ({ children }) => <Heading as="h1">{children}</Heading>,
  h2: ({ children }) => <Heading as="h2">{children}</Heading>,
  h3: ({ children }) => <Heading as="h3">{children}</Heading>,
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

function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
  );
}

export async function renderMarkdownEmail(markdown: string) {
  return render(
    <ChakraEmailProvider>
      <Html lang="en">
        <Head />
        <Preview>Latest update from Acme.</Preview>
        <Body bg="gray.50">
          <Container bg="white" p={6} maxW="640px">
            <MarkdownBody markdown={markdown} />
          </Container>
        </Body>
      </Html>
    </ChakraEmailProvider>,
    { pretty: true },
  );
}

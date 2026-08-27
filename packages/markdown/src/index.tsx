import {
  Children,
  Fragment,
  type CSSProperties,
  type ReactElement,
} from 'react';
import {
  Blockquote,
  Box,
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
  useSlotRecipeStyles,
} from '@chakra-email/core';
import {
  CodeBlock,
  type CodeBlockProps,
  type CodeHighlighter,
} from '@chakra-email/code-block';
import ReactMarkdown, {
  type Components,
  type Options as ReactMarkdownOptions,
} from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownProps extends Omit<
  ReactMarkdownOptions,
  'children' | 'components' | 'remarkPlugins'
> {
  children: string;
  components?: Components;
  /** Enables tables, task lists, strikethrough, and autolinks. */
  gfm?: boolean;
  remarkPlugins?: ReactMarkdownOptions['remarkPlugins'];
  size?: string;
  codeHighlighter?: CodeHighlighter;
  codeBlockLineNumbers?: boolean;
  codeBlockProps?: Omit<
    CodeBlockProps,
    'code' | 'language' | 'highlighter' | 'lineNumbers'
  >;
}

export const chakraEmailMarkdownRecipeKey = 'chakraEmailMarkdown';

function languageFromClassName(className: string | undefined) {
  return /^language-(.+)$/.exec(className ?? '')?.[1];
}

function createEmailComponents(
  styles: Record<string, CSSProperties>,
  options: Pick<
    MarkdownProps,
    'codeBlockLineNumbers' | 'codeBlockProps' | 'codeHighlighter'
  >,
): Components {
  return {
    a: ({ children, href, title }) => (
      <Link href={href as string} title={title} style={styles.link}>
        {children}
      </Link>
    ),
    blockquote: ({ children }) => (
      <Blockquote style={styles.blockquote}>{children}</Blockquote>
    ),
    code: ({ children, className }) => {
      const language = languageFromClassName(className);
      const code = String(children).replace(/\n$/, '');

      return language ? (
        <CodeBlock
          {...options.codeBlockProps}
          code={code}
          language={language}
          lineNumbers={options.codeBlockLineNumbers}
          highlighter={options.codeHighlighter}
        />
      ) : (
        <Code style={styles.code}>{children}</Code>
      );
    },
    h1: ({ children }) => (
      <Heading as="h1" style={styles.heading}>
        {children}
      </Heading>
    ),
    h2: ({ children }) => (
      <Heading as="h2" style={styles.heading}>
        {children}
      </Heading>
    ),
    h3: ({ children }) => (
      <Heading as="h3" style={styles.heading}>
        {children}
      </Heading>
    ),
    h4: ({ children }) => (
      <Heading as="h4" style={styles.heading}>
        {children}
      </Heading>
    ),
    h5: ({ children }) => (
      <Heading as="h5" style={styles.heading}>
        {children}
      </Heading>
    ),
    h6: ({ children }) => (
      <Heading as="h6" style={styles.heading}>
        {children}
      </Heading>
    ),
    hr: () => <Hr style={styles.hr} />,
    img: ({ alt, src, title }) => (
      <Img
        alt={alt as string}
        src={src as string}
        title={title}
        style={styles.image}
      />
    ),
    li: ({ children }) => (
      <ListItem style={styles.listItem}>{children}</ListItem>
    ),
    ol: ({ children }) => (
      <List as="ol" style={styles.list}>
        {children}
      </List>
    ),
    p: ({ children }) => <Text style={styles.paragraph}>{children}</Text>,
    pre: ({ children }) => {
      const child = Children.only(children) as ReactElement<{
        className?: string;
      }>;
      const className = child.props.className;

      return languageFromClassName(className) ? (
        <Fragment>{children}</Fragment>
      ) : (
        <Pre style={styles.pre}>{children}</Pre>
      );
    },
    table: ({ children }) => <Table style={styles.table}>{children}</Table>,
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    td: ({ children }) => (
      <TableCell style={styles.tableCell}>{children}</TableCell>
    ),
    th: ({ children }) => (
      <TableHeader style={styles.tableHeader}>{children}</TableHeader>
    ),
    thead: ({ children }) => <TableHead>{children}</TableHead>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    ul: ({ children }) => (
      <List as="ul" style={styles.list}>
        {children}
      </List>
    ),
  };
}

export function Markdown({
  children,
  components,
  gfm = true,
  remarkPlugins,
  size,
  codeHighlighter,
  codeBlockLineNumbers,
  codeBlockProps,
  ...options
}: MarkdownProps) {
  const styles = useSlotRecipeStyles(chakraEmailMarkdownRecipeKey, { size });
  const emailComponents = createEmailComponents(styles, {
    codeBlockLineNumbers,
    codeBlockProps,
    codeHighlighter,
  });
  const plugins = [...(gfm ? [remarkGfm] : []), ...(remarkPlugins ?? [])];

  return (
    <Box style={styles.root}>
      <ReactMarkdown
        {...options}
        components={{ ...emailComponents, ...components }}
        remarkPlugins={plugins}
      >
        {children}
      </ReactMarkdown>
    </Box>
  );
}

export type { Components as MarkdownComponents } from 'react-markdown';

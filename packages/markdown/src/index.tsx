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
  EmailRenderError,
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

export interface MarkdownLimits {
  maxSourceBytes?: number;
  maxLines?: number;
  maxAstNodes?: number;
  maxNestingDepth?: number;
}

export const strictMarkdownLimits: Readonly<Required<MarkdownLimits>> =
  Object.freeze({
    maxSourceBytes: 256 * 1_024,
    maxLines: 10_000,
    maxAstNodes: 5_000,
    maxNestingDepth: 8,
  });

export interface MarkdownProps extends Omit<
  ReactMarkdownOptions,
  'children' | 'components' | 'remarkPlugins'
> {
  children: string;
  components?: Components;
  /** Enables tables, task lists, strikethrough, and autolinks. */
  gfm?: boolean;
  /** Optional admission limits. Use `"strict"` for the exported strict preset. */
  limits?: MarkdownLimits | 'strict';
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

interface MarkdownAstNode {
  children?: MarkdownAstNode[];
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function validateLimit(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new EmailRenderError(
      'INVALID_COMPONENT_PROP',
      `${name} must be a positive safe integer.`,
    );
  }
}

function resolveMarkdownLimits(
  limits: MarkdownProps['limits'],
): MarkdownLimits | undefined {
  const resolved = limits === 'strict' ? strictMarkdownLimits : limits;
  if (!resolved) {
    return undefined;
  }

  validateLimit(resolved.maxSourceBytes, 'maxSourceBytes');
  validateLimit(resolved.maxLines, 'maxLines');
  validateLimit(resolved.maxAstNodes, 'maxAstNodes');
  validateLimit(resolved.maxNestingDepth, 'maxNestingDepth');
  return resolved;
}

function assertMarkdownSourceLimits(
  source: string,
  limits: MarkdownLimits | undefined,
): void {
  if (!limits) {
    return;
  }

  const sourceBytes = byteLength(source);
  if (
    limits.maxSourceBytes !== undefined &&
    sourceBytes > limits.maxSourceBytes
  ) {
    throw new EmailRenderError(
      'SOURCE_TOO_LARGE',
      'Markdown source exceeds the configured byte limit.',
      {
        details: {
          actualBytes: sourceBytes,
          limitBytes: limits.maxSourceBytes,
        },
      },
    );
  }

  const lineCount = source.length === 0 ? 0 : source.split(/\r\n?|\n/u).length;
  if (limits.maxLines !== undefined && lineCount > limits.maxLines) {
    throw new EmailRenderError(
      'SOURCE_TOO_LARGE',
      'Markdown source exceeds the configured line limit.',
      {
        details: { actualLines: lineCount, limitLines: limits.maxLines },
      },
    );
  }
}

function createMarkdownLimitPlugin(limits: MarkdownLimits) {
  return () => (tree: MarkdownAstNode) => {
    let nodeCount = 0;

    function visit(node: MarkdownAstNode, depth: number): void {
      nodeCount += 1;
      if (limits.maxAstNodes !== undefined && nodeCount > limits.maxAstNodes) {
        throw new EmailRenderError(
          'AST_TOO_LARGE',
          'Markdown syntax tree exceeds the configured node limit.',
          {
            details: {
              actualNodes: nodeCount,
              limitNodes: limits.maxAstNodes,
            },
          },
        );
      }
      if (
        limits.maxNestingDepth !== undefined &&
        depth > limits.maxNestingDepth
      ) {
        throw new EmailRenderError(
          'NESTING_TOO_DEEP',
          'Markdown syntax tree exceeds the configured nesting limit.',
          {
            details: {
              actualDepth: depth,
              limitDepth: limits.maxNestingDepth,
            },
          },
        );
      }
      for (const child of node.children ?? []) {
        visit(child, depth + 1);
      }
    }

    visit(tree, 0);
  };
}

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
  limits,
  remarkPlugins,
  size,
  codeHighlighter,
  codeBlockLineNumbers,
  codeBlockProps,
  ...options
}: MarkdownProps) {
  const resolvedLimits = resolveMarkdownLimits(limits);
  assertMarkdownSourceLimits(children, resolvedLimits);
  const styles = useSlotRecipeStyles(chakraEmailMarkdownRecipeKey, { size });
  const emailComponents = createEmailComponents(styles, {
    codeBlockLineNumbers,
    codeBlockProps,
    codeHighlighter,
  });
  const plugins: NonNullable<ReactMarkdownOptions['remarkPlugins']> = [
    ...(gfm ? [remarkGfm] : []),
    ...(resolvedLimits ? [createMarkdownLimitPlugin(resolvedLimits)] : []),
    ...(remarkPlugins ?? []),
  ];

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

import { parse, type DefaultTreeAdapterTypes } from 'parse5';

export const htmlIndentOptions = [0, 2, 4, 8] as const;
export type HtmlIndent = (typeof htmlIndentOptions)[number];

export function parseHtmlIndent(value: unknown): HtmlIndent {
  return htmlIndentOptions.find((width) => String(width) === value) ?? 2;
}

export interface HtmlDisplay {
  lines: string[];
  /** Translate original rendered-HTML diagnostics to the display's gutter. */
  lineForSourcePosition(line: number, column?: number): number | undefined;
}

type Range = { start: number; end: number; depth: number; afterDepth?: number };
type Segment = { start: number; end: number; line: number };
type Node = DefaultTreeAdapterTypes.Node;

const rawElements = new Set([
  'pre',
  'textarea',
  'script',
  'style',
  'title',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'plaintext',
]);
const inlineElements = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'del',
  'dfn',
  'em',
  'i',
  'img',
  'ins',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr',
]);

function onlyInlineChildren(node: Node, depth = 0): boolean {
  if (depth > 128) return false;
  const children =
    'content' in node
      ? (node as DefaultTreeAdapterTypes.Template).content.childNodes
      : 'childNodes' in node
        ? node.childNodes
        : [];
  return children.every(
    (child) =>
      !('tagName' in child) ||
      (inlineElements.has(child.tagName) &&
        onlyInlineChildren(child, depth + 1)),
  );
}

/** Format source slices, not reserialized DOM: attributes, entities, comments,
 * raw text, and even markup repaired/ignored by the parser remain in source order.
 * This is a read-only display; never use the result for sending or exporting.
 */
export function formatHtmlForDisplay(
  html: string,
  indent: HtmlIndent,
): HtmlDisplay {
  const segments: Segment[] = [];
  const sourceLines = [0];
  for (const match of html.matchAll(/\r\n|\r|\n/gu))
    sourceLines.push((match.index ?? 0) + match[0].length);
  const original = (): HtmlDisplay => ({
    lines: html.split(/\r\n|\r|\n/u),
    lineForSourcePosition: (line) =>
      Number.isInteger(line) && line >= 1 && line <= sourceLines.length
        ? line
        : undefined,
  });
  if (!indent || html.length > 2_000_000) return original();

  const ranges: Range[] = [];
  try {
    const pending: Array<{ node: Node; depth: number }> = [
      {
        node: parse(html, {
          sourceCodeLocationInfo: true,
          scriptingEnabled: false,
        }),
        depth: 0,
      },
    ];
    while (pending.length) {
      const entry = pending.pop();
      if (!entry) break;
      const { node, depth } = entry;
      if (depth > 128) return original();
      const location = node.sourceCodeLocation;
      let childDepth = depth;
      if ('tagName' in node && location && 'startTag' in location) {
        const { startTag, endTag } = location;
        if (
          rawElements.has(node.tagName) ||
          (!/[\r\n]/u.test(
            html.slice(location.startOffset, location.endOffset),
          ) &&
            onlyInlineChildren(node))
        ) {
          ranges.push({
            start: location.startOffset,
            end: location.endOffset,
            depth,
          });
          continue;
        }
        if (startTag) {
          ranges.push({
            start: startTag.startOffset,
            end: startTag.endOffset,
            depth,
            afterDepth: depth + 1,
          });
          childDepth++;
        }
        if (endTag)
          ranges.push({
            start: endTag.startOffset,
            end: endTag.endOffset,
            depth,
          });
      } else if (
        location &&
        !('childNodes' in node) &&
        node.nodeName !== '#text'
      ) {
        // Text-node locations can span intervening markup when parse5 merges
        // whitespace (e.g. before/after </body>). Markup boundaries are reliable;
        // preserve text as the gaps between them instead of overlapping ranges.
        ranges.push({
          start: location.startOffset,
          end: location.endOffset,
          depth,
        });
      }
      const children =
        'content' in node
          ? (node as DefaultTreeAdapterTypes.Template).content.childNodes
          : 'childNodes' in node
            ? node.childNodes
            : [];
      for (const child of children)
        pending.push({ node: child, depth: childDepth });
    }
  } catch {
    return original();
  }
  ranges.sort((a, b) => a.start - b.start);
  const output: string[] = [];
  let line = 1;
  let outputLength = 0;
  const emit = (start: number, end: number, depth: number, trim: boolean) => {
    const source = html.slice(start, end);
    if (trim) {
      start += source.length - source.trimStart().length;
      end -= source.length - source.trimEnd().length;
    }
    if (start >= end) return true;
    const text = html.slice(start, end);
    outputLength += depth * indent + text.length + 1;
    if (outputLength > 4_000_000) return false;
    segments.push({ start, end, line });
    output.push(' '.repeat(depth * indent) + text);
    line += (text.match(/\r\n|\r|\n/gu)?.length ?? 0) + 1;
    return true;
  };
  let cursor = 0;
  let gapDepth = 0;
  for (const range of ranges) {
    // Adoption-agency repairs can yield overlapping source locations. Keep the
    // original instead of duplicating, deleting, or reordering any markup.
    if (range.start < cursor) return original();
    if (
      !emit(cursor, range.start, gapDepth, true) ||
      !emit(range.start, range.end, range.depth, false)
    )
      return original();
    cursor = range.end;
    gapDepth = range.afterDepth ?? range.depth;
  }
  if (!emit(cursor, html.length, gapDepth, true)) return original();
  if (!output.length) return original();
  return {
    lines: output.join('\n').split(/\r\n|\r|\n/u),
    lineForSourcePosition(sourceLine, column = 1) {
      const start = sourceLines[sourceLine - 1];
      if (
        start === undefined ||
        !Number.isInteger(sourceLine) ||
        !Number.isInteger(column) ||
        column < 1
      )
        return undefined;
      const end = sourceLines[sourceLine] ?? html.length;
      const offset = Math.min(start + column - 1, Math.max(start, end - 1));
      const segment =
        segments.find((candidate) => candidate.end > offset) ?? segments.at(-1);
      if (!segment) return undefined;
      return (
        segment.line +
        (html
          .slice(segment.start, Math.max(segment.start, offset))
          .match(/\r\n|\r|\n/gu)?.length ?? 0)
      );
    },
  };
}

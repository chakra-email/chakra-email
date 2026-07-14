export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface RenderMarkdownOptions {
  headingIdPrefix?: string;
  headingLevelOffset?: number;
  omitLeadingTitle?: boolean;
}

export function renderMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {},
): string {
  const lines = markdown.trim().split(/\r?\n/);
  const blocks: string[] = [];
  let index = 0;
  let omittedLeadingTitle = false;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const result = readCodeFence(lines, index);
      blocks.push(result.html);
      index = result.nextIndex;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const sourceLevel = heading[1].length;
      const text = heading[2];

      if (
        options.omitLeadingTitle &&
        !omittedLeadingTitle &&
        sourceLevel === 1
      ) {
        omittedLeadingTitle = true;
        index += 1;
        continue;
      }

      const level = Math.min(
        6,
        sourceLevel + Math.max(0, options.headingLevelOffset ?? 0),
      );
      blocks.push(
        `<h${level} id="${headingId(text, options.headingIdPrefix)}">${renderInline(text, options.headingIdPrefix)}</h${level}>`,
      );
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const result = readTable(lines, index, options.headingIdPrefix);
      blocks.push(result.html);
      index = result.nextIndex;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const result = readList(lines, index, false, options.headingIdPrefix);
      blocks.push(result.html);
      index = result.nextIndex;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const result = readList(lines, index, true, options.headingIdPrefix);
      blocks.push(result.html);
      index = result.nextIndex;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const result = readBlockquote(lines, index, options.headingIdPrefix);
      blocks.push(result.html);
      index = result.nextIndex;
      continue;
    }

    const result = readParagraph(lines, index, options.headingIdPrefix);
    blocks.push(result.html);
    index = result.nextIndex;
  }

  return blocks.join('\n');
}

type ReadResult = {
  html: string;
  nextIndex: number;
};

function readCodeFence(lines: string[], startIndex: number): ReadResult {
  const openingLine = lines[startIndex] ?? '';
  const language = openingLine.replace('```', '').trim();
  const codeLines: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length && !lines[index]?.startsWith('```')) {
    codeLines.push(lines[index] ?? '');
    index += 1;
  }

  return {
    html: `<pre class="code-block"><code data-language="${escapeHtml(
      language,
    )}">${escapeHtml(codeLines.join('\n'))}</code></pre>`,
    nextIndex: index + 1,
  };
}

function readList(
  lines: string[],
  startIndex: number,
  isOrdered: boolean,
  headingIdPrefix: string | undefined,
): ReadResult {
  const items: string[] = [];
  const matcher = isOrdered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
  let index = startIndex;

  while (index < lines.length && matcher.test(lines[index] ?? '')) {
    const item = (lines[index] ?? '').replace(matcher, '');
    items.push(`<li>${renderInline(item, headingIdPrefix)}</li>`);
    index += 1;
  }

  const tag = isOrdered ? 'ol' : 'ul';
  return {
    html: `<${tag}>${items.join('')}</${tag}>`,
    nextIndex: index,
  };
}

function readBlockquote(
  lines: string[],
  startIndex: number,
  headingIdPrefix: string | undefined,
): ReadResult {
  const quoteLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? '')) {
    quoteLines.push((lines[index] ?? '').replace(/^\s*>\s?/, ''));
    index += 1;
  }

  return {
    html: `<blockquote>${renderInline(quoteLines.join(' '), headingIdPrefix)}</blockquote>`,
    nextIndex: index,
  };
}

function readParagraph(
  lines: string[],
  startIndex: number,
  headingIdPrefix: string | undefined,
): ReadResult {
  const paragraphLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && !isBlockBoundary(lines, index)) {
    paragraphLines.push(lines[index] ?? '');
    index += 1;
  }

  return {
    html: `<p>${renderInline(paragraphLines.join(' '), headingIdPrefix)}</p>`,
    nextIndex: index,
  };
}

function readTable(
  lines: string[],
  startIndex: number,
  headingIdPrefix: string | undefined,
): ReadResult {
  const headers = parseTableCells(lines[startIndex] ?? '');
  const bodyRows: string[][] = [];
  let index = startIndex + 2;

  while (index < lines.length && isTableRow(lines[index] ?? '')) {
    bodyRows.push(parseTableCells(lines[index] ?? ''));
    index += 1;
  }

  const headerHtml = headers
    .map((header) => `<th>${renderInline(header, headingIdPrefix)}</th>`)
    .join('');
  const rowsHtml = bodyRows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${renderInline(cell, headingIdPrefix)}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  return {
    html: `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`,
    nextIndex: index,
  };
}

function isBlockBoundary(lines: string[], index: number): boolean {
  const line = lines[index] ?? '';

  return (
    line.trim() === '' ||
    line.startsWith('```') ||
    /^(#{1,4})\s+/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    isTableStart(lines, index)
  );
}

function isTableStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? '';
  const nextLine = lines[index + 1] ?? '';

  return isTableRow(line) && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(nextLine);
}

function isTableRow(line: string): boolean {
  return line.includes('|') && line.trim().length > 0;
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderInline(
  value: string,
  headingIdPrefix: string | undefined,
): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_match: string, label: string, href: string) => {
        const safeHref = resolveHref(href, headingIdPrefix);
        return `<a href="${safeHref}">${label}</a>`;
      },
    );
}

function resolveHref(
  href: string,
  headingIdPrefix: string | undefined,
): string {
  const normalized = href.trim();
  // eslint-disable-next-line no-control-regex -- URL controls are stripped intentionally.
  const protocolInput = normalized.replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i
    .exec(protocolInput)?.[1]
    ?.toLowerCase();

  if (scheme) {
    return ['http', 'https', 'mailto', 'tel'].includes(scheme)
      ? normalized
      : '#';
  }

  if (normalized.startsWith('//')) {
    return normalized;
  }

  if (headingIdPrefix && normalized.startsWith('#') && normalized.length > 1) {
    return `#${slugify(headingIdPrefix)}-${slugify(normalized.slice(1))}`;
  }

  const markdownTarget = /^(.+\.md)(?:#(.+))?$/i.exec(normalized);
  if (markdownTarget) {
    const filename = markdownTarget[1].split('/').at(-1) ?? markdownTarget[1];
    const pageId = slugify(filename.replace(/\.md$/i, ''));
    const fragment = markdownTarget[2] ? `-${slugify(markdownTarget[2])}` : '';
    return `#${pageId}${fragment}`;
  }

  return normalized;
}

function headingId(value: string, prefix: string | undefined): string {
  const heading = slugify(value);
  return prefix ? `${slugify(prefix)}-${heading}` : heading;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

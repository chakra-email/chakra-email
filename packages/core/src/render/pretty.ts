const BLOCK_TAGS = new Set([
  'html',
  'head',
  'body',
  'meta',
  'link',
  'title',
  'div',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'hr',
  'blockquote',
  'pre',
  'br',
]);

function tagNameAt(source: string, start: number): string {
  const match = /^<\/?([a-z][a-z0-9]*)/i.exec(source.slice(start, start + 32));
  return match ? match[1].toLowerCase() : '';
}

function tagNameEndingAt(source: string, end: number): string {
  const start = source.lastIndexOf('<', end);
  return start === -1 ? '' : tagNameAt(source, start);
}

export function pretty(html: string): string {
  const preservedBlocks: string[] = [];
  // U+E000 is used below as a private-use placeholder marker for extracted
  // <pre>/<style> blocks. Strip any pre-existing occurrences from the input so
  // attacker- or content-supplied markers cannot corrupt the re-substitution.
  const protectedHtml = html
    .replace(/\uE000/g, '')
    .replace(/<(pre|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
      preservedBlocks.push(block);
      return `\uE000${preservedBlocks.length - 1}\uE000`;
    });

  const formatted = protectedHtml
    .replace(/></g, (boundary, offset: number, source: string) => {
      const closing = tagNameEndingAt(source, offset);
      const opening = tagNameAt(source, offset + 1);
      return BLOCK_TAGS.has(closing) || BLOCK_TAGS.has(opening) ? '>\n<' : boundary;
    })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

  return formatted.replace(/\uE000(\d+)\uE000/g, (_match, index) =>
    preservedBlocks[Number(index)]
  );
}

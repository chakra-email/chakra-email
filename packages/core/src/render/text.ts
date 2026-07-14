const STYLED_OPEN_TAG =
  /<([a-z][a-z0-9]*)\b[^>]*\bstyle=(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
const HIDDEN_DISPLAY_PROPERTY =
  /(?:^|;)\s*display\s*:\s*none(?:\s*!important)?(?=\s*(?:;|$))/i;
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function stripHiddenElements(html: string): string {
  let result = html;
  let match = findHiddenOpenTag(result);

  while (match) {
    const start = match.index;
    let end = start + match[0].length;

    const tagName = match[1].toLowerCase();

    if (!match[0].endsWith('/>') && !VOID_ELEMENTS.has(tagName)) {
      const tagPattern = new RegExp(`</?${tagName}\\b[^>]*>`, 'gi');
      tagPattern.lastIndex = end;
      let depth = 1;
      end = result.length;

      let tagMatch = tagPattern.exec(result);
      while (tagMatch) {
        depth += tagMatch[0].startsWith('</') ? -1 : 1;
        if (depth === 0) {
          end = tagMatch.index + tagMatch[0].length;
          break;
        }
        tagMatch = tagPattern.exec(result);
      }
    }

    result = result.slice(0, start) + result.slice(end);
    match = findHiddenOpenTag(result);
  }

  return result;
}

function findHiddenOpenTag(html: string): RegExpExecArray | null {
  STYLED_OPEN_TAG.lastIndex = 0;

  let match = STYLED_OPEN_TAG.exec(html);
  while (match) {
    const style = match[2] ?? match[3] ?? '';

    if (HIDDEN_DISPLAY_PROPERTY.test(style)) {
      return match;
    }

    match = STYLED_OPEN_TAG.exec(html);
  }

  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&zwnj;/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeWhitespace(value: string): string {
  return value
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

export function toPlainText(html: string): string {
  const content = stripHiddenElements(
    html
      .replace(/<!doctype[^>]*>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, ''),
  )
    .replace(/[\u200B\u200C\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*\/?>/gi, ' $1 ')
    .replace(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_match, href, label) => {
        const text = label.replace(/<[^>]+>/g, '').trim();
        return text ? `${text} [${href}]` : href;
      },
    )
    .replace(/<hr\b[^>]*\/?>/gi, '\n\n---\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(
      /<\/(p|div|h[1-6]|li|ul|ol|tr|table|thead|tbody|tfoot|section|blockquote|pre)>/gi,
      '\n\n',
    )
    .replace(/<[^>]+>/g, '');

  return normalizeWhitespace(decodeEntities(content));
}

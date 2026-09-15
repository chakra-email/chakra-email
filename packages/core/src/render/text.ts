import {
  convert,
  type FormatCallback,
  type HtmlToTextOptions,
  type SelectorDefinition,
} from 'html-to-text';

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

export type PlainTextOptions = HtmlToTextOptions;

const imageAltFormatter: FormatCallback = (element, _walk, builder) => {
  const alt = element.attribs?.['alt'];
  if (typeof alt === 'string' && alt.trim()) {
    builder.addInline(`${alt} `);
  }
};

const blockFormatter: FormatCallback = (element, walk, builder, options) => {
  builder.openBlock({ leadingLineBreaks: options.leadingLineBreaks ?? 2 });
  walk(element.children, builder);
  builder.closeBlock({ trailingLineBreaks: options.trailingLineBreaks ?? 2 });
};

const cellFormatter: FormatCallback = (element, walk, builder) => {
  walk(element.children, builder);
  builder.addInline(' ');
};

const horizontalRuleFormatter: FormatCallback = (_element, _walk, builder) => {
  builder.openBlock({ leadingLineBreaks: 2 });
  builder.addInline('---');
  builder.closeBlock({ trailingLineBreaks: 2 });
};

const plainTextFormatters = {
  chakraEmailBlock: blockFormatter,
  chakraEmailCell: cellFormatter,
  chakraEmailHorizontalRule: horizontalRuleFormatter,
  chakraEmailImageAlt: imageAltFormatter,
} as const;

export const plainTextSelectors: readonly SelectorDefinition[] = [
  { selector: 'head', format: 'skip' },
  { selector: 'style', format: 'skip' },
  { selector: 'script', format: 'skip' },
  { selector: '[data-skip-in-text=true]', format: 'skip' },
  { selector: 'h1', options: { uppercase: false } },
  { selector: 'h2', options: { uppercase: false } },
  { selector: 'h3', options: { uppercase: false } },
  { selector: 'h4', options: { uppercase: false } },
  { selector: 'h5', options: { uppercase: false } },
  { selector: 'h6', options: { uppercase: false } },
  { selector: 'blockquote', format: 'chakraEmailBlock' },
  { selector: 'hr', format: 'chakraEmailHorizontalRule' },
  {
    selector: 'a',
    options: {
      hideLinkHrefIfSameAsText: true,
      linkBrackets: ['[', ']'],
    },
  },
  { selector: 'img', format: 'chakraEmailImageAlt' },
  { selector: 'td', format: 'chakraEmailCell' },
  { selector: 'th', format: 'chakraEmailCell' },
  {
    selector: '[data-text-format=dataTable]',
    format: 'dataTable',
    options: { uppercaseHeaderCells: false },
  },
];

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

export function toPlainText(
  html: string,
  options: PlainTextOptions = {},
): string {
  return convert(stripHiddenElements(html), {
    ...options,
    formatters: {
      ...plainTextFormatters,
      ...options.formatters,
    },
    selectors: [
      ...plainTextSelectors,
      ...(options.selectors ?? []),
    ] as SelectorDefinition[],
    wordwrap: options.wordwrap ?? false,
  })
    .replace(/[\u200B\u200C\uFEFF]/gu, '')
    .replace(/\u00A0/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

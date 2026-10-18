import { parse, type DefaultTreeAdapterTypes, type ParserError } from 'parse5';
import type { PreviewLintFinding, PreviewLintSeverity } from './protocol.js';
import { compatibilityReferenceForRule } from './compatibility.js';
import {
  lintFindingDefaults,
  getLintRules,
  normalizeLintRules,
  resolveLintFinding,
  type PreviewLintOverrides,
  type PreviewLintRuleId,
} from './lint-rules.js';

export interface LintEmailOptions {
  text?: string;
  subject?: string;
  rules?: PreviewLintOverrides;
}

export interface LintEmailResult {
  findings: PreviewLintFinding[];
  /** Enabled static rules evaluated for this render, never network link rules. */
  rulesRun: string[];
}

type Document = DefaultTreeAdapterTypes.Document;
type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;

const severityOrder: Record<PreviewLintSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const ignoredParserErrors = new Set([
  'non-conforming-doctype',
  'non-void-html-element-start-tag-with-trailing-solidus',
]);

const unsupportedElements = new Map<
  string,
  {
    message: string;
    ruleId: PreviewLintRuleId;
    suggestion: string;
  }
>([
  [
    'script',
    {
      message: 'Scripts are removed or blocked by email clients.',
      ruleId: 'unsupported-script',
      suggestion: 'Remove the script and express the content as static HTML.',
    },
  ],
  [
    'form',
    {
      message: 'Forms are not dependable across email clients.',
      ruleId: 'unsupported-form',
      suggestion:
        'Link to a hosted form instead of embedding one in the email.',
    },
  ],
  [
    'iframe',
    {
      message: 'Embedded frames are blocked by most email clients.',
      ruleId: 'unsupported-iframe',
      suggestion:
        'Replace the frame with an image and a link to hosted content.',
    },
  ],
  [
    'object',
    {
      message: 'Embedded objects are blocked by most email clients.',
      ruleId: 'unsupported-object',
      suggestion: 'Replace the object with static content.',
    },
  ],
  [
    'embed',
    {
      message: 'Embedded content is blocked by most email clients.',
      ruleId: 'unsupported-embed',
      suggestion: 'Replace the embed with static content.',
    },
  ],
  [
    'svg',
    {
      message: 'Inline SVG has inconsistent support in email clients.',
      ruleId: 'unsupported-svg',
      suggestion: 'Use a hosted PNG or JPEG with descriptive alternative text.',
    },
  ],
  [
    'video',
    {
      message: 'Embedded video is not consistently supported in email clients.',
      ruleId: 'unsupported-video',
      suggestion: 'Use a linked poster image with a clear play affordance.',
    },
  ],
  [
    'audio',
    {
      message: 'Embedded audio is not consistently supported in email clients.',
      ruleId: 'unsupported-audio',
      suggestion: 'Link to a hosted audio player.',
    },
  ],
  [
    'button',
    {
      message: 'Native button elements are unreliable in email clients.',
      ruleId: 'unsupported-button',
      suggestion: 'Use a styled anchor or the Chakra Email Button component.',
    },
  ],
]);

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function elementsIn(document: Document): Element[] {
  const elements: Element[] = [];
  const visit = (node: Node): void => {
    if (isElement(node)) {
      elements.push(node);
    }

    if ('childNodes' in node) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  };

  visit(document);
  return elements;
}

function attribute(element: Element, name: string): string | undefined {
  return element.attrs.find((candidate) => candidate.name === name)?.value;
}

function textContent(node: Node): string {
  if ('value' in node) {
    return node.value;
  }

  if (!('childNodes' in node)) {
    return '';
  }

  return node.childNodes.map((child) => textContent(child)).join('');
}

function escapeIdentifier(value: string): string {
  // Hex escapes also handle punctuation and leading digits without CSS.escape in Node.
  return Array.from(value, (character, index) =>
    /[a-z_]/iu.test(character) ||
    (character === '-' && value.length > 1) ||
    (index > 0 &&
      !(index === 1 && value[0] === '-') &&
      /[0-9]/u.test(character))
      ? character
      : `\\${character.codePointAt(0)?.toString(16)} `,
  ).join('');
}

function createFinding(elements: Element[]) {
  const idCounts = new Map<string, number>();
  for (const element of elements) {
    const id = attribute(element, 'id');
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  const selectors = new Map<Element, string>();
  const selectorFor = (element: Element): string => {
    const cached = selectors.get(element);
    if (cached) return cached;
    const id = attribute(element, 'id');
    const parent = element.parentNode;
    let selector: string;
    if (id && idCounts.get(id) === 1) {
      selector = `#${escapeIdentifier(id)}`;
    } else if (element.tagName === 'body' || !parent || !isElement(parent)) {
      selector = escapeIdentifier(element.tagName);
    } else {
      const siblings = parent.childNodes.filter(isElement);
      selector = `${selectorFor(parent)} > ${escapeIdentifier(element.tagName)}:nth-child(${siblings.indexOf(element) + 1})`;
    }
    selectors.set(element, selector);
    return selector;
  };
  return (
    element: Element | undefined,
    ruleId: PreviewLintRuleId,
    message: string,
    suggestion: string,
  ): PreviewLintFinding => {
    const location = element?.sourceCodeLocation;
    return {
      ...lintFindingDefaults(ruleId),
      column: location?.startCol,
      compatibility: compatibilityReferenceForRule(ruleId),
      element: element ? `<${element.tagName}>` : undefined,
      line: location?.startLine,
      selector: element ? selectorFor(element) : undefined,
      message,
      suggestion,
    };
  };
}

function previewElement(elements: Element[]): Element | undefined {
  return elements.find((element) => {
    const style = attribute(element, 'style') ?? '';
    return (
      element.tagName === 'div' &&
      attribute(element, 'aria-hidden') === 'true' &&
      (/display\s*:\s*none/i.test(style) || /mso-hide\s*:\s*all/i.test(style))
    );
  });
}

function normalizedText(value: string): string {
  return value
    .replace(/[\u200b-\u200d\ufeff]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** Extract the hidden email preheader without its zero-width/nonbreaking-space padding. */
export function extractPreviewText(document: Document): string | undefined {
  const element = previewElement(elementsIn(document));
  const text = element ? normalizedText(textContent(element)) : '';
  return text || undefined;
}

function parserFinding(error: ParserError): PreviewLintFinding {
  return {
    ...lintFindingDefaults('valid-html'),
    column: error.startCol,
    line: error.startLine,
    message: `The rendered HTML contains malformed markup (${error.code}).`,
    suggestion:
      'Inspect the rendered HTML near this location and fix the tag structure.',
  };
}

function lintDocumentMetadata(
  document: Document,
  elements: Element[],
  finding: ReturnType<typeof createFinding>,
): PreviewLintFinding[] {
  const findings: PreviewLintFinding[] = [];
  const doctype = document.childNodes.find(
    (node) => node.nodeName === '#documentType',
  );
  const html = elements.find((element) => element.tagName === 'html');
  const body = elements.find((element) => element.tagName === 'body');
  const title = elements.find((element) => element.tagName === 'title');
  const viewport = elements.find(
    (element) =>
      element.tagName === 'meta' &&
      attribute(element, 'name')?.toLowerCase() === 'viewport',
  );
  const contentType = elements.find(
    (element) =>
      element.tagName === 'meta' &&
      (attribute(element, 'charset') !== undefined ||
        attribute(element, 'http-equiv')?.toLowerCase() === 'content-type'),
  );
  const preheader = previewElement(elements);
  const previewText = extractPreviewText(document);

  if (!doctype) {
    findings.push(
      finding(
        undefined,
        'document-doctype',
        'The email has no document type declaration.',
        'Render a complete email document with the Chakra Email Html component.',
      ),
    );
  }

  if (!body?.sourceCodeLocation) {
    findings.push(
      finding(
        body,
        'document-body',
        'The rendered output is an HTML fragment rather than a complete email document.',
        'Wrap the template in the Chakra Email Html and Body components.',
      ),
    );
  }

  if (!html || !attribute(html, 'lang')?.trim()) {
    findings.push(
      finding(
        html,
        'document-language',
        'The email does not declare a document language.',
        'Set the lang prop on the Chakra Email Html component.',
      ),
    );
  }

  if (!title || !textContent(title).trim()) {
    findings.push(
      finding(
        title,
        'document-title',
        'The email has no descriptive title.',
        'Add a title element inside Head for assistive technology and browser views.',
      ),
    );
  }

  if (!viewport) {
    findings.push(
      finding(
        undefined,
        'viewport-meta',
        'The email is missing a viewport meta tag.',
        'Include the Chakra Email Head component for mobile viewport metadata.',
      ),
    );
  }

  if (!contentType) {
    findings.push(
      finding(
        undefined,
        'content-type-meta',
        'The email does not declare its character encoding.',
        'Include the Chakra Email Head component for UTF-8 metadata.',
      ),
    );
  }

  if (!previewText) {
    findings.push(
      finding(
        undefined,
        'preview-text',
        'No hidden preview text was detected.',
        'Add the Chakra Email Preview component near the start of the email.',
      ),
    );
  }

  if (
    !elements.some(
      (element) =>
        element.tagName === 'meta' &&
        attribute(element, 'name')?.toLowerCase() === 'color-scheme',
    )
  ) {
    findings.push(
      finding(
        undefined,
        'color-scheme-meta',
        'The email does not declare its color scheme.',
        'Declare `color-scheme` so clients that support dark mode apply your dark styles.',
      ),
    );
  }
  const previewLength = Array.from(previewText ?? '').length;
  if (previewLength < 40 || previewLength > 150) {
    findings.push(
      finding(
        preheader,
        'preview-text-length',
        'Preview text is outside the recommended 40–150 character range.',
        "Aim for 40–150 characters so clients don't fill the gap with body text.",
      ),
    );
  }

  return findings;
}

function lintElement(
  element: Element,
  finding: ReturnType<typeof createFinding>,
  hasRoundrect: boolean,
  elementsById: Map<string, Element>,
): PreviewLintFinding[] {
  const findings: PreviewLintFinding[] = [];
  const unsupported = unsupportedElements.get(element.tagName);

  if (unsupported) {
    findings.push(
      finding(
        element,
        unsupported.ruleId,
        unsupported.message,
        unsupported.suggestion,
      ),
    );
  }

  if (
    element.tagName === 'style' &&
    /@font-face\b/iu.test(textContent(element))
  ) {
    findings.push(
      finding(
        element,
        'css-font-face',
        'Web fonts are unavailable in many email clients.',
        'Declare a dependable fallback font stack and verify the result without the remote font.',
      ),
    );
  }

  if (element.tagName === 'img') {
    if (attribute(element, 'alt') === undefined) {
      findings.push(
        finding(
          element,
          'image-alt',
          'This image has no alt attribute.',
          'Add descriptive alternative text, or alt="" for a decorative image.',
        ),
      );
    }

    if (
      attribute(element, 'width') === undefined ||
      attribute(element, 'height') === undefined
    ) {
      findings.push(
        finding(
          element,
          'image-dimensions',
          'This image does not have both width and height HTML attributes.',
          'Set pixel width and height values to reduce layout shifts and improve legacy client rendering.',
        ),
      );
    }
  }

  if (
    element.tagName === 'link' &&
    attribute(element, 'rel')?.toLowerCase() === 'stylesheet'
  ) {
    findings.push(
      finding(
        element,
        'external-stylesheet',
        'External stylesheets are frequently removed by email clients.',
        'Inline critical styles on each element.',
      ),
    );
  }

  for (const name of ['href', 'src', 'background']) {
    const value = attribute(element, name);
    if (value?.trimStart().toLowerCase().startsWith('http://')) {
      findings.push(
        finding(
          element,
          'insecure-url',
          `The ${name} URL uses insecure HTTP.`,
          'Use an HTTPS URL to avoid blocked content and mixed-content warnings.',
        ),
      );
    }
  }

  const style = attribute(element, 'style');
  if (style) {
    if (
      element.tagName === 'a' &&
      !hasRoundrect &&
      /(?:^|;)\s*border-radius\s*:/iu.test(style) &&
      hasBackgroundColor(style)
    ) {
      findings.push(
        finding(
          element,
          'css-border-radius',
          'This rounded button has no VML fallback.',
          'Classic Outlook for Windows ignores border-radius. Add a VML fallback if the shape matters.',
        ),
      );
    }
    const layout = /display\s*:\s*((?:inline-)?(?:flex|grid))\b/iu.exec(style);
    if (layout) {
      const layoutKind = layout[1]?.includes('grid') ? 'grid' : 'flex';
      findings.push(
        finding(
          element,
          layoutKind === 'grid' ? 'css-display-grid' : 'css-display-flex',
          'Flexbox or grid layout can fail in legacy email clients.',
          'Use table-based layout components for critical email structure.',
        ),
      );
    }

    if (/position\s*:\s*(?:fixed|sticky)\b/i.test(style)) {
      findings.push(
        finding(
          element,
          'css-position',
          'Fixed or sticky positioning is not dependable in email clients.',
          'Use normal document flow and table-based layout.',
        ),
      );
    }

    if (/background-image\s*:/i.test(style)) {
      findings.push(
        finding(
          element,
          'css-background-image',
          'CSS background images need fallbacks in some desktop clients.',
          'Provide a background color and verify whether an Outlook-specific fallback is needed.',
        ),
      );
    }
  }

  if (element.tagName === 'a' && attribute(element, 'href') !== undefined) {
    const labelledBy = attribute(element, 'aria-labelledby')
      ?.trim()
      .split(/\s+/u)
      .map((id) => elementsById.get(id))
      .filter((node): node is Element => node !== undefined);
    const ariaLabel = attribute(element, 'aria-label');
    const content = accessibleLinkText(element);
    const accessibleText = normalizedText(
      labelledBy?.length
        ? labelledBy.map((node) => textContent(node)).join(' ')
        : ariaLabel?.trim()
          ? ariaLabel
          : normalizedText(content) || attribute(element, 'title') || '',
    );
    if (
      !accessibleText ||
      /^(?:click here|here|link|read more|more)$/iu.test(accessibleText)
    ) {
      findings.push(
        finding(
          element,
          'link-text',
          'This link has empty or ambiguous accessible text.',
          'Use link text that says where it goes.',
        ),
      );
    }
  }

  return findings;
}

function hasBackgroundColor(style: string): boolean {
  const declarations = [
    ...style.matchAll(/(?:^|;)\s*(background(?:-color)?)\s*:\s*([^;]+)/giu),
  ];
  return declarations.some(([, property, rawValue]) => {
    const value = rawValue?.trim() ?? '';
    if (
      !value ||
      /^(?:none|transparent|inherit|initial|unset|revert)(?:\s*!important)?$/iu.test(
        value,
      )
    )
      return false;
    if (property?.toLowerCase() === 'background-color') return true;
    // Shorthand may contain an image plus a color; don't treat image-only backgrounds as colors.
    return (
      /(?:^|\s)(?:#[\da-f]{3,8}\b|(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color|var)\()/iu.test(
        value,
      ) ||
      (/^[a-z]+(?:\s*!important)?$/iu.test(value) &&
        !/^(?:repeat|no-repeat|scroll|fixed|local|center|top|right|bottom|left|cover|contain)(?:\s*!important)?$/iu.test(
          value,
        ))
    );
  });
}

function containsRoundrect(node: Node): boolean {
  if (isElement(node) && node.tagName.toLowerCase() === 'v:roundrect')
    return true;
  if (
    node.nodeName === '#comment' &&
    'data' in node &&
    /^\[if\s+([^\]]+)\]>/iu.test(node.data)
  ) {
    const condition = /^\[if\s+([^\]]+)\]>/iu.exec(node.data)?.[1] ?? '';
    if (
      /\bmso\b/iu.test(condition) &&
      !/!\s*mso\b/iu.test(condition) &&
      /<v:roundrect\b/iu.test(node.data)
    )
      return true;
  }
  return 'childNodes' in node && node.childNodes.some(containsRoundrect);
}

function accessibleLinkText(node: Node): string {
  if (isElement(node)) {
    if (
      attribute(node, 'aria-hidden') === 'true' ||
      attribute(node, 'hidden') !== undefined ||
      /(?:display\s*:\s*none|visibility\s*:\s*hidden)/iu.test(
        attribute(node, 'style') ?? '',
      ) ||
      ['script', 'style'].includes(node.tagName)
    )
      return '';
    if (node.tagName === 'img') return attribute(node, 'alt') ?? '';
  }
  if ('value' in node) return node.value;
  return 'childNodes' in node
    ? node.childNodes.map(accessibleLinkText).join('')
    : '';
}

function lintPlaceholders(
  document: Document,
  finding: ReturnType<typeof createFinding>,
): PreviewLintFinding[] {
  const findings: PreviewLintFinding[] = [];
  const placeholder =
    /\[[^\]\r\n]{3,}\]|\{\{[^}]*\}\}|\b(?:TODO|TBD|XXX)\b|lorem\s+ipsum/iu;
  const visit = (node: Node, inLink = false): string => {
    if (isElement(node)) {
      if (['head', 'style', 'script', 'template'].includes(node.tagName))
        return '';
      const style = attribute(node, 'style') ?? '';
      if (
        node !== previewElement([node]) &&
        (attribute(node, 'hidden') !== undefined ||
          attribute(node, 'aria-hidden') === 'true' ||
          /(?:display\s*:\s*none|visibility\s*:\s*hidden|mso-hide\s*:\s*all)/iu.test(
            style,
          ))
      )
        return '';
      const text = node.childNodes
        .map((child) => visit(child, inLink || node.tagName === 'a'))
        .join('');
      // Bracketed link labels (including Markdown links) are not placeholders.
      const eligibleText =
        inLink || node.tagName === 'a'
          ? text.replace(/\[[^\]]*\]/gu, '')
          : text.replace(/\[[^\]]*\]\([^)]*\)/gu, '');
      if (placeholder.test(normalizedText(eligibleText))) {
        findings.push(
          finding(
            node,
            'placeholder-text',
            'This content appears to contain placeholder text.',
            'Replace placeholder text before sending.',
          ),
        );
        return ''; // Report the deepest affected element, not every ancestor.
      }
      return eligibleText;
    }
    return 'value' in node
      ? node.value
      : 'childNodes' in node
        ? node.childNodes.map((child) => visit(child, inLink)).join('')
        : '';
  };
  visit(document);
  return findings;
}

export function lintEmail(
  html: string,
  options: LintEmailOptions = {},
): LintEmailResult {
  const overrides = normalizeLintRules(options.rules);
  const plainText = options.text;
  const parserErrors: ParserError[] = [];
  const document = parse(html, {
    onParseError: (error) => {
      if (!ignoredParserErrors.has(error.code)) {
        parserErrors.push(error);
      }
    },
    sourceCodeLocationInfo: true,
  });
  const elements = elementsIn(document);
  const finding = createFinding(elements);
  const elementsById = new Map(
    elements.flatMap((element) => {
      const id = attribute(element, 'id');
      return id ? [[id, element] as const] : [];
    }),
  );
  // Conditional comments remain comments in parse5; inspect those for Outlook VML.
  const hasRoundrect = containsRoundrect(document);
  const findings = [
    ...parserErrors.map((error) => parserFinding(error)),
    ...lintDocumentMetadata(document, elements, finding),
    ...elements.flatMap((element) =>
      lintElement(element, finding, hasRoundrect, elementsById),
    ),
    ...lintPlaceholders(document, finding),
  ];

  if (
    options.subject !== undefined &&
    Array.from(options.subject).length > 60
  ) {
    findings.push(
      finding(
        undefined,
        'subject-length',
        'The subject is longer than 60 characters.',
        'Many inboxes cut subjects around 40–60 characters. Lead with what matters.',
      ),
    );
  }

  if (plainText !== undefined && !plainText.trim()) {
    findings.push({
      ...lintFindingDefaults('plain-text-content'),
      message: 'The generated plain-text version is empty.',
      suggestion:
        'Include meaningful text content for clients that cannot render HTML.',
    });
  }

  if (Buffer.byteLength(html, 'utf8') > 102 * 1024) {
    findings.push({
      ...lintFindingDefaults('message-size'),
      message: 'The rendered HTML is larger than 102 KB and may be clipped.',
      suggestion:
        'Reduce repeated markup and inline styles, or simplify the email content.',
    });
  }

  const resolved = findings.flatMap((entry) => {
    const finding = resolveLintFinding(entry, overrides);
    return finding ? [finding] : [];
  });
  resolved.sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      (left.line ?? Number.MAX_SAFE_INTEGER) -
        (right.line ?? Number.MAX_SAFE_INTEGER) ||
      left.ruleId.localeCompare(right.ruleId),
  );
  return {
    findings: resolved,
    rulesRun: getLintRules(overrides)
      .filter(
        (rule) =>
          rule.category !== 'links' &&
          (rule.id !== 'subject-length' || options.subject !== undefined) &&
          (rule.id !== 'plain-text-content' || plainText !== undefined),
      )
      .map((rule) => rule.id),
  };
}

/** Backwards-compatible convenience API with the original defaults and return type. */
export function lintRenderedEmail(
  html: string,
  plainText?: string,
): PreviewLintFinding[] {
  return lintEmail(html, { text: plainText }).findings;
}

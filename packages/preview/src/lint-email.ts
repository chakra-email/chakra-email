import { parse, type DefaultTreeAdapterTypes, type ParserError } from 'parse5';
import type {
  PreviewLintCategory,
  PreviewLintFinding,
  PreviewLintSeverity,
} from './protocol.js';
import { compatibilityReferenceForRule } from './compatibility.js';

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
    severity: PreviewLintSeverity;
    suggestion: string;
  }
>([
  [
    'script',
    {
      message: 'Scripts are removed or blocked by email clients.',
      severity: 'error',
      suggestion: 'Remove the script and express the content as static HTML.',
    },
  ],
  [
    'form',
    {
      message: 'Forms are not dependable across email clients.',
      severity: 'error',
      suggestion:
        'Link to a hosted form instead of embedding one in the email.',
    },
  ],
  [
    'iframe',
    {
      message: 'Embedded frames are blocked by most email clients.',
      severity: 'error',
      suggestion:
        'Replace the frame with an image and a link to hosted content.',
    },
  ],
  [
    'object',
    {
      message: 'Embedded objects are blocked by most email clients.',
      severity: 'error',
      suggestion: 'Replace the object with static content.',
    },
  ],
  [
    'embed',
    {
      message: 'Embedded content is blocked by most email clients.',
      severity: 'error',
      suggestion: 'Replace the embed with static content.',
    },
  ],
  [
    'svg',
    {
      message: 'Inline SVG has inconsistent support in email clients.',
      severity: 'warning',
      suggestion: 'Use a hosted PNG or JPEG with descriptive alternative text.',
    },
  ],
  [
    'video',
    {
      message: 'Embedded video is not consistently supported in email clients.',
      severity: 'warning',
      suggestion: 'Use a linked poster image with a clear play affordance.',
    },
  ],
  [
    'audio',
    {
      message: 'Embedded audio is not consistently supported in email clients.',
      severity: 'warning',
      suggestion: 'Link to a hosted audio player.',
    },
  ],
  [
    'button',
    {
      message: 'Native button elements are unreliable in email clients.',
      severity: 'warning',
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

function finding(
  element: Element | undefined,
  ruleId: string,
  category: PreviewLintCategory,
  severity: PreviewLintSeverity,
  message: string,
  suggestion: string,
): PreviewLintFinding {
  const location = element?.sourceCodeLocation;

  return {
    category,
    column: location?.startCol,
    compatibility: compatibilityReferenceForRule(ruleId),
    element: element ? `<${element.tagName}>` : undefined,
    line: location?.startLine,
    message,
    ruleId,
    severity,
    suggestion,
  };
}

function parserFinding(error: ParserError): PreviewLintFinding {
  return {
    category: 'markup',
    column: error.startCol,
    line: error.startLine,
    message: `The rendered HTML contains malformed markup (${error.code}).`,
    ruleId: 'valid-html',
    severity: 'error',
    suggestion:
      'Inspect the rendered HTML near this location and fix the tag structure.',
  };
}

function lintDocumentMetadata(
  document: Document,
  elements: Element[],
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
  const preheader = elements.find((element) => {
    const style = attribute(element, 'style') ?? '';
    return (
      element.tagName === 'div' &&
      attribute(element, 'aria-hidden') === 'true' &&
      (/display\s*:\s*none/i.test(style) ||
        /mso-hide\s*:\s*all/i.test(style)) &&
      textContent(element).trim().length > 0
    );
  });

  if (!doctype) {
    findings.push(
      finding(
        undefined,
        'document-doctype',
        'compatibility',
        'warning',
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
        'markup',
        'warning',
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
        'accessibility',
        'warning',
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
        'accessibility',
        'info',
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
        'compatibility',
        'warning',
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
        'compatibility',
        'warning',
        'The email does not declare its character encoding.',
        'Include the Chakra Email Head component for UTF-8 metadata.',
      ),
    );
  }

  if (!preheader) {
    findings.push(
      finding(
        undefined,
        'preview-text',
        'content',
        'info',
        'No hidden preview text was detected.',
        'Add the Chakra Email Preview component near the start of the email.',
      ),
    );
  }

  return findings;
}

function lintElement(element: Element): PreviewLintFinding[] {
  const findings: PreviewLintFinding[] = [];
  const unsupported = unsupportedElements.get(element.tagName);

  if (unsupported) {
    findings.push(
      finding(
        element,
        `unsupported-${element.tagName}`,
        'compatibility',
        unsupported.severity,
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
        'compatibility',
        'info',
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
          'accessibility',
          'error',
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
          'compatibility',
          'info',
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
        'compatibility',
        'warning',
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
          'deliverability',
          'warning',
          `The ${name} URL uses insecure HTTP.`,
          'Use an HTTPS URL to avoid blocked content and mixed-content warnings.',
        ),
      );
    }
  }

  const style = attribute(element, 'style');
  if (style) {
    const layout = /display\s*:\s*((?:inline-)?(?:flex|grid))\b/iu.exec(style);
    if (layout) {
      const layoutKind = layout[1]?.includes('grid') ? 'grid' : 'flex';
      findings.push(
        finding(
          element,
          `css-display-${layoutKind}`,
          'compatibility',
          'warning',
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
          'compatibility',
          'warning',
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
          'compatibility',
          'info',
          'CSS background images need fallbacks in some desktop clients.',
          'Provide a background color and verify whether an Outlook-specific fallback is needed.',
        ),
      );
    }
  }

  return findings;
}

export function lintRenderedEmail(
  html: string,
  plainText?: string,
): PreviewLintFinding[] {
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
  const findings = [
    ...parserErrors.map((error) => parserFinding(error)),
    ...lintDocumentMetadata(document, elements),
    ...elements.flatMap((element) => lintElement(element)),
  ];

  if (plainText !== undefined && !plainText.trim()) {
    findings.push({
      category: 'content',
      message: 'The generated plain-text version is empty.',
      ruleId: 'plain-text-content',
      severity: 'warning',
      suggestion:
        'Include meaningful text content for clients that cannot render HTML.',
    });
  }

  if (Buffer.byteLength(html, 'utf8') > 102 * 1024) {
    findings.push({
      category: 'deliverability',
      message: 'The rendered HTML is larger than 102 KB and may be clipped.',
      ruleId: 'message-size',
      severity: 'warning',
      suggestion:
        'Reduce repeated markup and inline styles, or simplify the email content.',
    });
  }

  return findings.sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      (left.line ?? Number.MAX_SAFE_INTEGER) -
        (right.line ?? Number.MAX_SAFE_INTEGER) ||
      left.ruleId.localeCompare(right.ruleId),
  );
}

export interface PreviewCompatibilityReference {
  feature: string;
  source: 'Can I Email';
  url: string;
}

/**
 * Stable source links for lint rules backed by Can I Email feature data.
 * Support percentages are deliberately not copied because the upstream data
 * changes as clients and test results are updated.
 */
export const previewCompatibilityReferences: Readonly<
  Record<string, PreviewCompatibilityReference>
> = {
  'css-background-image': {
    feature: 'CSS background-image',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/css-background-image/',
  },
  'css-display-flex': {
    feature: 'CSS display:flex',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/css-display-flex/',
  },
  'css-display-grid': {
    feature: 'CSS display:grid',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/css-display-grid/',
  },
  'css-font-face': {
    feature: 'CSS @font-face',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/css-at-font-face/',
  },
  'unsupported-audio': {
    feature: 'HTML audio element',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/html-audio/',
  },
  'unsupported-form': {
    feature: 'HTML form element',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/html-form/',
  },
  'unsupported-svg': {
    feature: 'Embedded SVG image',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/html-svg/',
  },
  'unsupported-video': {
    feature: 'HTML video element',
    source: 'Can I Email',
    url: 'https://www.caniemail.com/features/html-video/',
  },
};

export function compatibilityReferenceForRule(
  ruleId: string,
): PreviewCompatibilityReference | undefined {
  return previewCompatibilityReferences[ruleId];
}

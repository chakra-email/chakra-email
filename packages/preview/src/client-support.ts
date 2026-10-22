// Bump clientSupportReviewed whenever this curated data changes, after reviewing
// the linked Can I Email feature pages and their underlying support notes.
export type PreviewClientId =
  | 'apple-mail'
  | 'ios-mail'
  | 'gmail'
  | 'gmail-android'
  | 'outlook-com'
  | 'outlook-windows'
  | 'outlook-mac'
  | 'yahoo';

export const previewClients: Readonly<Record<PreviewClientId, string>> =
  Object.freeze({
    'apple-mail': 'Apple Mail',
    'ios-mail': 'iOS Mail',
    gmail: 'Gmail',
    'gmail-android': 'Gmail (Android)',
    'outlook-com': 'Outlook.com',
    'outlook-windows': 'Outlook (Windows)',
    'outlook-mac': 'Outlook (Mac)',
    yahoo: 'Yahoo Mail',
  });

export const clientSupportReviewed = '2026-10';

const clients = (...ids: PreviewClientId[]): readonly PreviewClientId[] =>
  Object.freeze(ids);

/**
 * Known breakages, not a complete support matrix or a guarantee for unlisted clients.
 * Only clear unsupported results from the handoff's seed list are retained; partial
 * and conditional support are deliberately excluded. Windows means classic Outlook
 * (the source's Windows desktop results), not the new Outlook web-based client.
 * Gmail and Yahoo refer to desktop webmail; their mobile apps are not inferred.
 * The review date is ours, not a claim that upstream retested every client that month.
 */
export const knownBreakages: Readonly<
  Record<string, readonly PreviewClientId[]>
> = Object.freeze({
  // Windows 2003–2019: unsupported CSS; VML RoundRect is a separate fallback.
  // https://www.caniemail.com/features/css-border-radius/
  'css-border-radius': clients('outlook-windows'),
  // Windows 2007–2019: unsupported CSS; VML backgrounds are a separate fallback.
  // https://www.caniemail.com/features/css-background-image/
  'css-background-image': clients('outlook-windows'),
  // Windows 2007–2019: unsupported.
  // https://www.caniemail.com/features/css-display-flex/
  'css-display-flex': clients('outlook-windows'),
  // Windows 2007–2019: unsupported. Gmail's 2026-03 results are supported/partial.
  // https://www.caniemail.com/features/css-display-grid/
  'css-display-grid': clients('outlook-windows'),
  // Gmail desktop/Android and Yahoo desktop: unsupported (2019-07).
  // Windows is excluded: upstream marks its declaration support as partial.
  // https://www.caniemail.com/features/css-at-font-face/
  'css-font-face': clients('gmail', 'gmail-android', 'yahoo'),
  // Gmail desktop/Android (2021-05), Windows 2007–2019: unsupported.
  // Yahoo is excluded because its relative positioning support is partial.
  // https://www.caniemail.com/features/css-position/
  'css-position': clients('gmail', 'gmail-android', 'outlook-windows'),
  // Gmail desktop/Android and Yahoo desktop (2019-02): unsupported.
  // Windows is excluded: upstream supports <link> in its 2007–2019 results.
  // https://www.caniemail.com/features/html-link/
  'external-stylesheet': clients('gmail', 'gmail-android', 'yahoo'),
  // Embedded SVG: Gmail desktop/Android (2020-02), Windows 2007–2019: unsupported.
  // https://www.caniemail.com/features/html-svg/
  'unsupported-svg': clients('gmail', 'gmail-android', 'outlook-windows'),
  // Gmail/Yahoo (2019-09), Windows 2007–2019, Outlook.com (2024-01): cannot play.
  // Outlook.com retains the element but its CSP prevents playback (note 8).
  // https://www.caniemail.com/features/html-video/
  'unsupported-video': clients(
    'gmail',
    'gmail-android',
    'outlook-com',
    'outlook-windows',
    'yahoo',
  ),
  // Gmail/Yahoo (2020-04), Windows 2007–2019, Outlook.com (2024-01): cannot play.
  // Outlook.com's result is unsupported even though it retains the element (note 4).
  // https://www.caniemail.com/features/html-audio/
  'unsupported-audio': clients(
    'gmail',
    'gmail-android',
    'outlook-com',
    'outlook-windows',
    'yahoo',
  ),
  // Windows 2003–2019: unsupported. Gmail desktop and Android support form submission.
  // https://www.caniemail.com/features/html-form/
  'unsupported-form': clients('outlook-windows'),
});

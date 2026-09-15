import type { CSSProperties } from 'react';
import { resolveFontFamily } from '../system/index.js';
import { useTheme } from '../theme/index.js';

export type FontFormat =
  | 'woff'
  | 'woff2'
  | 'truetype'
  | 'opentype'
  | 'embedded-opentype'
  | 'svg';

export interface WebFontSource {
  /** Absolute HTTP(S) URL to the font file. */
  url: string;
  format: FontFormat;
}

export interface FontProps {
  /** Web-font name or theme font token applied to the email. */
  fontFamily: string;
  /** Theme font token, CSS stack, or ordered list used when the primary font is unavailable. */
  fallbackFontFamily?: string | readonly string[];
  /** Optional remote web-font source. Unsupported clients continue to use the fallback stack. */
  webFont?: WebFontSource;
  fontStyle?: CSSProperties['fontStyle'];
  fontWeight?: CSSProperties['fontWeight'];
}

const unsafeCssPunctuation = /[{};<>]/;
const genericFamilies = new Set([
  'cursive',
  'fantasy',
  'monospace',
  'sans-serif',
  'serif',
  'system-ui',
]);

function assertSafeCssValue(value: string, label: string): string {
  const hasControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127;
  });

  if (
    value.length === 0 ||
    unsafeCssPunctuation.test(value) ||
    hasControlCharacter
  ) {
    throw new TypeError(`${label} contains an unsafe CSS value.`);
  }

  return value;
}

function quoteCssString(value: string, label: string): string {
  return JSON.stringify(assertSafeCssValue(value.trim(), label));
}

function formatFontFamily(value: string, label: string): string {
  const family = assertSafeCssValue(value.trim(), label);

  if (
    family.includes(',') ||
    family.startsWith('var(') ||
    family.startsWith('"') ||
    family.startsWith("'") ||
    genericFamilies.has(family.toLowerCase())
  ) {
    return family;
  }

  return quoteCssString(family, label);
}

function firstFontFamily(value: string): string {
  return (
    value
      .split(',', 1)[0]
      ?.trim()
      .replace(/^(['"])(.*)\1$/, '$2') ?? value
  );
}

function resolveFamily(
  value: string,
  label: string,
  theme: ReturnType<typeof useTheme>,
): string {
  const resolved = resolveFontFamily(value, theme) ?? value;
  return formatFontFamily(resolved, label);
}

function validateWebFontUrl(url: string): string {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new TypeError('webFont.url must be an absolute HTTP(S) URL.');
  }

  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    throw new TypeError(
      'webFont.url must be an absolute HTTP(S) URL without credentials.',
    );
  }

  return parsed.href;
}

/**
 * Declares a web font and an email-safe fallback stack. Place this component
 * inside `Head`. Font tokens are resolved from the nearest `ThemeProvider`.
 */
export function Font({
  fontFamily,
  fallbackFontFamily = 'body',
  webFont,
  fontStyle = 'normal',
  fontWeight = 400,
}: FontProps) {
  const theme = useTheme();
  const fallbackValues: readonly string[] = Array.isArray(fallbackFontFamily)
    ? [...fallbackFontFamily]
    : [fallbackFontFamily];
  const fallbackStack = fallbackValues.map((value, index) =>
    resolveFamily(value, `fallbackFontFamily[${index}]`, theme),
  );
  const primaryFamily = webFont
    ? quoteCssString(fontFamily, 'fontFamily')
    : resolveFamily(fontFamily, 'fontFamily', theme);
  const styleValue = assertSafeCssValue(String(fontStyle), 'fontStyle');
  const weightValue = assertSafeCssValue(String(fontWeight), 'fontWeight');
  const msoFallback = firstFontFamily(fallbackStack[0] ?? 'Arial');
  const fontFace = webFont
    ? `
    @font-face {
      font-family: ${primaryFamily};
      font-style: ${styleValue};
      font-weight: ${weightValue};
      mso-font-alt: ${quoteCssString(msoFallback, 'fallbackFontFamily')};
      src: url(${quoteCssString(validateWebFontUrl(webFont.url), 'webFont.url')}) format(${quoteCssString(webFont.format, 'webFont.format')});
    }
`
    : '';
  const styles = `${fontFace}
    * {
      font-family: ${[primaryFamily, ...fallbackStack].join(', ')};
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}

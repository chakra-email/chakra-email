import type { CSSProperties } from 'react';

export const paddingStyleKeys = [
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
] as const satisfies ReadonlyArray<keyof CSSProperties>;

export function splitStyles(
  styles: CSSProperties,
  extractedKeys: ReadonlyArray<keyof CSSProperties>
): [CSSProperties, CSSProperties] {
  const retainedStyles = { ...styles };
  const extractedStyles: CSSProperties = {};
  const retainedRecord = retainedStyles as Record<string, unknown>;
  const extractedRecord = extractedStyles as Record<string, unknown>;

  for (const key of extractedKeys) {
    const value = retainedRecord[key];

    if (value !== undefined) {
      extractedRecord[key] = value;
      delete retainedRecord[key];
    }
  }

  return [retainedStyles, extractedStyles];
}

/**
 * Converts resolved CSS widths into values understood by legacy table width
 * attributes. Other units stay in inline CSS because HTML width attributes
 * only accept pixels or percentages.
 */
export function getLegacyWidthAttribute(
  width: CSSProperties['width']
): string | number | undefined {
  if (typeof width === 'number') {
    return Number.isFinite(width) && width >= 0 ? Math.round(width) : undefined;
  }

  if (typeof width !== 'string') {
    return undefined;
  }

  const value = width.trim();
  const pixelMatch = /^(\d+(?:\.\d+)?)px$/i.exec(value);

  if (pixelMatch) {
    return Math.round(Number(pixelMatch[1]));
  }

  return /^\d+(?:\.\d+)?%$/.test(value) ? value : undefined;
}

/**
 * Mirrors the effective four-sided CSS padding as an Outlook-only
 * `mso-padding-alt` value. The normal padding remains on the anchor so its
 * entire visual hit area stays clickable in clients with standards support.
 */
export function getMsoPaddingAlt(styles: CSSProperties): string | undefined {
  let top: string | number | undefined;
  let right: string | number | undefined;
  let bottom: string | number | undefined;
  let left: string | number | undefined;

  for (const [property, value] of Object.entries(styles)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (property === 'padding') {
      const expanded = expandPadding(value);
      if (expanded) {
        [top, right, bottom, left] = expanded;
      }
    } else if (property === 'paddingTop') {
      top = value;
    } else if (property === 'paddingRight') {
      right = value;
    } else if (property === 'paddingBottom') {
      bottom = value;
    } else if (property === 'paddingLeft') {
      left = value;
    }
  }

  if ([top, right, bottom, left].every((value) => value === undefined)) {
    return undefined;
  }

  return [top, right, bottom, left]
    .map((value) => serializeLength(value ?? 0))
    .join(' ');
}

function expandPadding(
  value: unknown
): [string | number, string | number, string | number, string | number] | undefined {
  if (typeof value === 'number') {
    return [value, value, value, value];
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parts = value.trim().split(/\s+/);

  if (parts.length === 1) {
    return [parts[0], parts[0], parts[0], parts[0]];
  }
  if (parts.length === 2) {
    return [parts[0], parts[1], parts[0], parts[1]];
  }
  if (parts.length === 3) {
    return [parts[0], parts[1], parts[2], parts[1]];
  }
  if (parts.length === 4) {
    return [parts[0], parts[1], parts[2], parts[3]];
  }

  return undefined;
}

function serializeLength(value: string | number): string {
  return typeof value === 'number' && value !== 0 ? `${value}px` : String(value);
}

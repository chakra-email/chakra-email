import type { CSSProperties } from 'react';

const UNSAFE_STYLE_PROPS = new Set([
  'animation',
  'backdropfilter',
  'boxshadow',
  'filter',
  'position',
  'transform',
  'transition',
  'zindex',
]);

const UNSAFE_DISPLAY_VALUES = new Set([
  'box',
  'flex',
  'flexbox',
  'grid',
  'inline-box',
  'inline-flex',
  'inline-flexbox',
  'inline-grid',
]);

const UNITLESS_CSS_PROPERTIES = new Set([
  'animation-iteration-count',
  'column-count',
  'fill-opacity',
  'flex',
  'flex-grow',
  'flex-shrink',
  'font-weight',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'stroke-opacity',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
]);

export function filterEmailUnsafeStyles(styles: CSSProperties): CSSProperties {
  const safeStyles: CSSProperties = { ...styles };
  const safeStyleRecord = safeStyles as Record<string, unknown>;

  for (const prop of Object.keys(safeStyles)) {
    if (UNSAFE_STYLE_PROPS.has(normalizeStylePropertyName(prop))) {
      delete safeStyleRecord[prop];
    }
  }

  if (
    typeof safeStyles.display === 'string' &&
    UNSAFE_DISPLAY_VALUES.has(normalizeDisplayValue(safeStyles.display))
  ) {
    safeStyles.display = 'block';
  }

  return safeStyles;
}

function normalizeDisplayValue(display: string): string {
  return display
    .trim()
    .toLowerCase()
    .replace(/^-(?:webkit|moz|ms|o)-/, '');
}

function normalizeStylePropertyName(property: string): string {
  if (property.startsWith('--')) {
    return property;
  }

  return property
    .replace(/^-(?:webkit|moz|ms|o)-/i, '')
    .replace(/^(?:Webkit|Moz|ms|O)(?=[A-Z])/, '')
    .replace(/-/g, '')
    .toLowerCase();
}

/**
 * Serializes a style object into an inline CSS declaration string. Numeric
 * values receive a `px` suffix unless the property is unitless (line-height,
 * opacity, font-weight, etc.).
 *
 * The output is NOT HTML-escaped. Do not interpolate it into attribute
 * strings that may contain untrusted values.
 */
export function stylesToInlineString(styles: CSSProperties): string {
  return Object.entries(styles)
    .filter((entry): entry is [string, string | number] => {
      const value = entry[1];
      return value !== undefined && value !== null && value !== '';
    })
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      const cssValue =
        typeof value === 'number' && value !== 0 && !UNITLESS_CSS_PROPERTIES.has(cssKey)
          ? `${value}px`
          : value;
      return `${cssKey}: ${cssValue}`;
    })
    .join('; ');
}

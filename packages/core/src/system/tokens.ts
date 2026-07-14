import type { EmailTheme, ThemeScale } from '../theme/index.js';

type ResolvedTokenValue = string | number;
type ResolvableScale = ThemeScale | Array<string | number> | undefined;

interface ScaleResolution {
  matched: boolean;
  value: ResolvedTokenValue | undefined;
}

const tokenReferencePattern = /\{([^}]+)\}/g;

const numericStringPattern = /^-?(\d+\.?\d*|\.\d+)$/;

const maxResponsiveDepth = 8;

function getPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const record = value as Record<string, unknown>;
    const segmentValue = Object.hasOwn(record, segment) ? record[segment] : undefined;

    return segmentValue ?? (Object.hasOwn(record, 'DEFAULT') ? record.DEFAULT : undefined);
  }, source);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getScaleValue(scale: ThemeScale, token: string | number): unknown {
  const directValue = Object.hasOwn(scale, String(token)) ? scale[String(token)] : undefined;

  return (
    directValue ??
    (typeof token === 'string' && token.includes('.') ? getPath(scale, token) : undefined)
  );
}

function hasScaleToken(scale: ResolvableScale, token: string | number): boolean {
  if (Array.isArray(scale)) {
    return typeof token === 'number' && Object.hasOwn(scale, token);
  }

  if (!scale) {
    return false;
  }

  return Object.hasOwn(scale, String(token)) || getScaleValue(scale, token) !== undefined;
}

/**
 * Normalizes raw style prop input before any scale/token resolution. Email
 * output has no media queries, so responsive arrays/objects degrade to their
 * base value, numeric strings are treated as numbers, and anything unusable
 * resolves to undefined instead of throwing.
 */
function normalizeStyleValue(value: unknown, depth = 0): ResolvedTokenValue | undefined {
  if (depth > maxResponsiveDepth) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return normalizeStyleValue(value[0], depth + 1);
  }

  if (isRecord(value)) {
    const baseValue = Object.hasOwn(value, 'base') ? value.base : Object.values(value)[0];
    return normalizeStyleValue(baseValue, depth + 1);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    return numericStringPattern.test(value.trim()) ? Number(value) : value;
  }

  return undefined;
}

function serializeCompositeTokenValue(value: Record<string, unknown>): string | undefined {
  if (
    typeof value.width === 'string' &&
    typeof value.style === 'string' &&
    typeof value.color === 'string'
  ) {
    return `${value.width} ${value.style} ${value.color}`;
  }

  return undefined;
}

function unwrapTokenValue(value: unknown): ResolvedTokenValue | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if ('value' in value) {
    const tokenValue = value.value;

    if (typeof tokenValue === 'string' || typeof tokenValue === 'number') {
      return tokenValue;
    }

    if (Array.isArray(tokenValue)) {
      return tokenValue.join(', ');
    }

    if (isRecord(tokenValue)) {
      const conditionalValue = tokenValue.base ?? tokenValue._light ?? tokenValue.default;
      const conditional = unwrapTokenValue(conditionalValue);

      if (conditional !== undefined) {
        return conditional;
      }

      return serializeCompositeTokenValue(tokenValue);
    }
  }

  return unwrapTokenValue(value.DEFAULT);
}

function resolveTokenReferences(
  value: ResolvedTokenValue,
  theme: EmailTheme,
  seen: Set<string>
): ResolvedTokenValue | undefined {
  if (typeof value === 'number') {
    return value;
  }

  let unresolved = false;

  const resolved = value.replace(tokenReferencePattern, (_match, path: string) => {
    const reference = resolveThemeReference(path.trim(), theme, seen);

    if (reference === undefined) {
      unresolved = true;
      return '';
    }

    return String(reference);
  });

  return unresolved ? undefined : resolved;
}

function resolveFromScale(
  scale: ResolvableScale,
  token: string | number,
  theme: EmailTheme,
  seen: Set<string>
): ResolvedTokenValue | undefined {
  if (Array.isArray(scale) && typeof token === 'number') {
    const value = unwrapTokenValue(scale[token]);
    return value === undefined ? undefined : resolveTokenReferences(value, theme, seen);
  }

  if (!scale || Array.isArray(scale)) {
    return undefined;
  }

  const value = unwrapTokenValue(getScaleValue(scale, token));

  if (value === undefined) {
    return undefined;
  }

  return resolveTokenReferences(value, theme, seen);
}

function resolveScaleCandidates(
  scales: readonly ResolvableScale[],
  token: string | number,
  theme: EmailTheme,
  seen: Set<string>
): ScaleResolution {
  let matched = false;

  for (const scale of scales) {
    matched = hasScaleToken(scale, token) || matched;
    const value = resolveFromScale(scale, token, theme, seen);

    if (value !== undefined) {
      return { matched, value };
    }
  }

  return { matched, value: undefined };
}

function resolveThemeReference(
  path: string,
  theme: EmailTheme,
  seen: Set<string>
): ResolvedTokenValue | undefined {
  if (seen.has(path)) {
    return undefined;
  }

  seen.add(path);

  try {
    const [scaleName, ...tokenParts] = path.split('.');
    const token = tokenParts.join('.');

    if (!scaleName || !token) {
      return undefined;
    }

    return resolveByScaleName(scaleName, token, theme, seen);
  } finally {
    seen.delete(path);
  }
}

function resolveByScaleName(
  scaleName: string,
  token: string | number,
  theme: EmailTheme,
  seen: Set<string>
): ResolvedTokenValue | undefined {
  switch (scaleName) {
    case 'colors':
      return resolveFromScale(theme.tokens?.colors, token, theme, seen) ??
        resolveFromScale(theme.colors, token, theme, seen);
    case 'space':
      return resolveFromScale(theme.tokens?.space, token, theme, seen) ??
        resolveFromScale(theme.space, token, theme, seen);
    case 'spacing':
      return resolveFromScale(theme.tokens?.spacing, token, theme, seen) ??
        resolveFromScale(theme.tokens?.space, token, theme, seen) ??
        resolveFromScale(theme.spacing, token, theme, seen) ??
        resolveFromScale(theme.space, token, theme, seen);
    case 'sizes':
      return resolveFromScale(theme.tokens?.sizes, token, theme, seen) ??
        resolveFromScale(theme.sizes, token, theme, seen);
    case 'fontSizes':
      return resolveFromScale(theme.tokens?.fontSizes, token, theme, seen) ??
        resolveFromScale(theme.fontSizes, token, theme, seen);
    case 'fontWeights':
      return resolveFromScale(theme.tokens?.fontWeights, token, theme, seen) ??
        resolveFromScale(theme.fontWeights, token, theme, seen);
    case 'fonts':
      return resolveFromScale(theme.tokens?.fonts, token, theme, seen) ??
        resolveFromScale(theme.fonts, token, theme, seen);
    case 'lineHeights':
      return resolveFromScale(theme.tokens?.lineHeights, token, theme, seen) ??
        resolveFromScale(theme.lineHeights, token, theme, seen);
    case 'radii':
      return resolveFromScale(theme.tokens?.radii, token, theme, seen) ??
        resolveFromScale(theme.radii, token, theme, seen);
    case 'borders':
      return resolveFromScale(theme.tokens?.borders, token, theme, seen) ??
        resolveFromScale(theme.borders, token, theme, seen);
    case 'borderWidths':
      return resolveFromScale(theme.tokens?.borderWidths, token, theme, seen) ??
        resolveFromScale(theme.borderWidths, token, theme, seen);
    case 'letterSpacings':
      return resolveFromScale(theme.tokens?.letterSpacings, token, theme, seen) ??
        resolveFromScale(theme.letterSpacings, token, theme, seen);
    default:
      return undefined;
  }
}

function toPx(value: ResolvedTokenValue | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === 'number' ? `${value}px` : value;
}

function toCssString(value: ResolvedTokenValue | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

export function resolveColor(
  value: string | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined || normalized === '') {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.semanticTokens?.colors, theme.tokens?.colors, theme.colors],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toCssString(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveSpacing(
  value: string | number | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.spacing, theme.tokens?.space, theme.spacing, theme.space],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toPx(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'number'
    ? `${normalized}px`
    : toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveSize(
  value: string | number | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.sizes, theme.sizes],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toPx(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'number'
    ? `${normalized}px`
    : toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveFontSize(
  value: string | number | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.fontSizes, theme.fontSizes],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toPx(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'number'
    ? `${normalized}px`
    : toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveFontWeight(
  value: string | number | undefined,
  theme: EmailTheme
): string | number | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.fontWeights, theme.fontWeights],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return resolution.value;
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'string'
    ? resolveTokenReferences(normalized, theme, seen)
    : normalized;
}

export function resolveFontFamily(
  value: string | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined || normalized === '') {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.fonts, theme.fonts],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toCssString(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveLineHeight(
  value: string | number | undefined,
  theme: EmailTheme
): string | number | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.lineHeights, theme.lineHeights],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return resolution.value;
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'string'
    ? resolveTokenReferences(normalized, theme, seen)
    : normalized;
}

export function resolveRadius(
  value: string | number | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.radii, theme.radii],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toPx(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'number'
    ? `${normalized}px`
    : toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveBorder(
  value: string | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined || normalized === '') {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.borders, theme.borders],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toPx(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveBorderWidth(
  value: string | number | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.borderWidths, theme.borderWidths],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toPx(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'number'
    ? `${normalized}px`
    : toCssString(resolveTokenReferences(normalized, theme, seen));
}

export function resolveLetterSpacing(
  value: string | number | undefined,
  theme: EmailTheme
): string | undefined {
  const normalized = normalizeStyleValue(value);

  if (normalized === undefined) {
    return undefined;
  }

  const seen = new Set<string>();
  const resolution = resolveScaleCandidates(
    [theme.tokens?.letterSpacings, theme.letterSpacings],
    normalized,
    theme,
    seen
  );

  if (resolution.value !== undefined) {
    return toPx(resolution.value);
  }

  if (resolution.matched) {
    return undefined;
  }

  return typeof normalized === 'number'
    ? `${normalized}px`
    : toCssString(resolveTokenReferences(normalized, theme, seen));
}

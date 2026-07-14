import { createElement, type ReactNode } from 'react';
import {
  ThemeProvider,
  mergeTheme,
  normalizeThemeInput,
  type EmailTheme,
  type ThemeInput,
  type ThemeOverride,
} from '@chakra-email/core/theme';

export * from '@chakra-email/core/theme';

export type ChakraV2Theme = ThemeInput;

export interface ChakraEmailV2ProviderProps {
  theme?: ChakraV2Theme;
  children: ReactNode;
}

const ROOT_FONT_SIZE_PX = 16;

/**
 * Chakra UI v2 theme keys that have no meaning when rendering email.
 * `components`/`styles` rely on runtime CSS, `config`/`breakpoints` rely on
 * color-mode and media queries, and `transition`/`zIndices` are not
 * email-safe, so they are dropped instead of silently carried along.
 */
const droppedChakraV2Keys: readonly string[] = [
  'components',
  'styles',
  'config',
  'breakpoints',
  'transition',
  'zIndices',
];

/**
 * Length-based scales whose values may use `rem`/`em` units in Chakra UI v2
 * themes. These are converted to `px` for email-client compatibility.
 */
const lengthScaleKeys: readonly string[] = [
  'space',
  'spacing',
  'sizes',
  'fontSizes',
  'lineHeights',
  'letterSpacings',
  'radii',
  'borders',
  'borderWidths',
];

const relativeUnitPattern = /(-?\d*\.?\d+)(?:rem|em)\b/g;
const tokenPathPattern = /^[a-zA-Z][\w-]*(?:\.[\w-]+)+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function convertRelativeUnits(value: string): string {
  return value.replace(relativeUnitPattern, (_match, amount: string) => {
    const px =
      Math.round(parseFloat(amount) * ROOT_FONT_SIZE_PX * 10000) / 10000;
    return `${px}px`;
  });
}

function convertScaleValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return convertRelativeUnits(value);
  }

  if (Array.isArray(value)) {
    return value.map(convertScaleValue);
  }

  if (isRecord(value)) {
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      output[key] = convertScaleValue(entry);
    }

    return output;
  }

  return value;
}

function isModeConditionObject(value: Record<string, unknown>): boolean {
  return (
    'default' in value ||
    'base' in value ||
    Object.keys(value).some((key) => key.startsWith('_'))
  );
}

function getScalePath(scale: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (!isRecord(value)) {
      return undefined;
    }

    return Object.hasOwn(value, segment) ? value[segment] : undefined;
  }, scale);
}

function adaptSemanticTokenLeaf(
  value: unknown,
  category: string,
  scale: Record<string, unknown>,
  seen: Set<string>,
): string | number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const sibling = getScalePath(scale, value);

  if (sibling !== undefined) {
    // Reference to another semantic token in the same category, e.g.
    // `danger: 'primary'`. The core resolver never looks up semantic tokens
    // by reference, so the target's email value is inlined here instead
    // (with a seen-set guarding against circular chains).
    if (seen.has(value)) {
      return undefined;
    }

    seen.add(value);

    return resolveSemanticTokenTarget(sibling, category, scale, seen);
  }

  if (tokenPathPattern.test(value)) {
    return `{${category}.${value}}`;
  }

  return lengthScaleKeys.includes(category)
    ? convertRelativeUnits(value)
    : value;
}

function resolveSemanticTokenTarget(
  target: unknown,
  category: string,
  scale: Record<string, unknown>,
  seen: Set<string>,
): string | number | undefined {
  if (isRecord(target)) {
    if ('value' in target) {
      const tokenValue = target.value;

      return typeof tokenValue === 'string' || typeof tokenValue === 'number'
        ? tokenValue
        : undefined;
    }

    if (isModeConditionObject(target)) {
      return adaptSemanticTokenLeaf(
        target.default ?? target.base ?? target._light,
        category,
        scale,
        seen,
      );
    }

    // Nested token group; not a usable leaf value.
    return undefined;
  }

  return adaptSemanticTokenLeaf(target, category, scale, seen);
}

function adaptSemanticTokenValue(
  value: unknown,
  category: string,
  scale: Record<string, unknown>,
): unknown {
  if (isRecord(value)) {
    if ('value' in value) {
      // Already a v3-style token; pass through untouched.
      return value;
    }

    if (isModeConditionObject(value)) {
      // Email has no reliable dark-mode CSS, so only the `default` mode
      // (falling back to `base`/`_light`) is kept; `_dark` etc. are ignored.
      // Tokens without a light-mode value keep an empty value so the raw
      // token name is never emitted as a literal CSS value downstream.
      const leaf = adaptSemanticTokenLeaf(
        value.default ?? value.base ?? value._light,
        category,
        scale,
        new Set<string>(),
      );

      return { value: leaf ?? '' };
    }

    // Nested semantic token group, e.g. `colors: { bg: { muted: ... } }`.
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      const adapted = adaptSemanticTokenValue(entry, category, scale);

      if (adapted !== undefined) {
        output[key] = adapted;
      }
    }

    return output;
  }

  const leaf = adaptSemanticTokenLeaf(
    value,
    category,
    scale,
    new Set<string>(),
  );

  return { value: leaf ?? '' };
}

function adaptSemanticTokens(
  semanticTokens: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [category, scale] of Object.entries(semanticTokens)) {
    if (!isRecord(scale)) {
      continue;
    }

    const adapted = adaptSemanticTokenValue(scale, category, scale);

    if (isRecord(adapted)) {
      output[category] = adapted;
    }
  }

  return output;
}

/**
 * Converts a Chakra UI v2 theme (e.g. `extendTheme` output) into a theme
 * override the email token resolver understands:
 *
 * - `rem`/`em` values in length scales are converted to `px` (1rem = 16px);
 *   unitless values (e.g. line-heights) are preserved as-is.
 * - v2 `semanticTokens` are rewritten to v3-style `{ value }` tokens. The
 *   `default` mode is used, `_dark` and other conditions are ignored, and
 *   bare token references such as `red.500` become `{colors.red.500}`.
 * - Non-visual v2 keys (`components`, `styles`, `config`, `breakpoints`,
 *   `transition`, `zIndices`) are dropped.
 * - The v2 `space` scale is mirrored onto `spacing` so it takes precedence
 *   over the built-in default spacing scale.
 */
export function adaptChakraV2Theme(theme: ChakraV2Theme): ThemeOverride {
  const source = normalizeThemeInput(theme);

  if (!source) {
    return {};
  }

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (droppedChakraV2Keys.includes(key)) {
      continue;
    }

    if (key === 'semanticTokens' && isRecord(value)) {
      output[key] = adaptSemanticTokens(value);
      continue;
    }

    if (lengthScaleKeys.includes(key)) {
      output[key] = convertScaleValue(value);
      continue;
    }

    output[key] = value;
  }

  if (output.space !== undefined && output.spacing === undefined) {
    output.spacing = output.space;
  }

  return output as ThemeOverride;
}

export function createChakraV2EmailTheme(theme: ChakraV2Theme): EmailTheme {
  return mergeTheme(adaptChakraV2Theme(theme));
}

export function ChakraEmailV2Provider({
  theme,
  children,
}: ChakraEmailV2ProviderProps) {
  return createElement(ThemeProvider, {
    theme: theme ? createChakraV2EmailTheme(theme) : undefined,
    children,
  });
}

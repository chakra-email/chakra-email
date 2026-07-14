import { defaultTheme } from './default-theme.js';
import type { EmailTheme, ThemeInput, ThemeOverride } from './types.js';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(
  override: Record<string, unknown>,
  base: Record<string, unknown>
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(base)) {
    if (!UNSAFE_KEYS.has(key)) {
      output[key] = base[key];
    }
  }

  for (const key of Object.keys(override)) {
    if (UNSAFE_KEYS.has(key)) {
      continue;
    }

    const baseValue = output[key];
    const value = override[key];

    if (isRecord(baseValue) && isRecord(value)) {
      output[key] = deepMerge(value, baseValue);
    } else {
      output[key] = value;
    }
  }

  return output;
}

export function mergeTheme(
  theme: ThemeInput | null | undefined,
  baseTheme: EmailTheme = defaultTheme
): EmailTheme {
  const themeSource = normalizeThemeInput(theme);

  if (!themeSource) {
    return baseTheme;
  }

  return deepMerge(
    themeSource as Record<string, unknown>,
    baseTheme as Record<string, unknown>
  ) as EmailTheme;
}

export function normalizeThemeInput(theme: ThemeInput | null | undefined): ThemeOverride | undefined {
  if (!theme || typeof theme !== 'object') {
    return undefined;
  }

  const candidate = theme as {
    theme?: ThemeOverride;
    _config?: {
      theme?: ThemeOverride;
    };
  };

  return candidate._config?.theme ?? candidate.theme ?? (theme as ThemeOverride);
}

export function defineTheme(theme: ThemeOverride): ThemeOverride {
  return theme;
}

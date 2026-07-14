import { describe, expect, it } from 'vitest';
import { defineTheme, mergeTheme, normalizeThemeInput } from './merge-theme';

describe('theme utilities', () => {
  it('merges custom theme scales with the default theme', () => {
    const theme = mergeTheme({
      colors: {
        brand: {
          500: '#0055ff',
        },
      },
    });

    expect(theme.colors?.white).toBe('#ffffff');
    expect((theme.colors?.brand as Record<string, string>)?.[500]).toBe('#0055ff');
  });

  it('merges nested scales containing keys named "theme" or "_config" without re-normalizing', () => {
    const theme = mergeTheme({
      colors: {
        theme: { 500: '#111111' },
        brand: { 500: '#222222' },
        _config: { 500: '#333333' },
      },
    });

    expect((theme.colors?.theme as Record<string, string>)?.[500]).toBe('#111111');
    expect((theme.colors?.brand as Record<string, string>)?.[500]).toBe('#222222');
    expect((theme.colors?._config as Record<string, string>)?.[500]).toBe('#333333');
    expect((theme.colors as Record<string, unknown>)?.[500]).toBeUndefined();
    expect(theme.colors?.white).toBe('#ffffff');
  });

  it('does not attach attacker-controlled prototypes from JSON-sourced themes', () => {
    const jsonTheme = JSON.parse(
      '{"__proto__": {"polluted": true}, "constructor": {"bad": true}, "prototype": {"bad": true}, "colors": {"__proto__": {"polluted": true}, "brand": {"500": "#0055ff"}}}'
    );

    const theme = mergeTheme(jsonTheme);

    expect(Object.getPrototypeOf(theme)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(theme.colors)).toBe(Object.prototype);
    expect(Object.keys(theme)).not.toContain('constructor');
    expect(Object.keys(theme)).not.toContain('prototype');
    expect(Object.keys(theme.colors as object)).not.toContain('__proto__');
    expect((theme as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((theme.colors?.brand as Record<string, string>)?.[500]).toBe('#0055ff');
  });

  it('normalizes plain, config, and system-like theme inputs', () => {
    const theme = { colors: { brand: { 500: '#111111' } } };

    expect(normalizeThemeInput(theme)).toBe(theme);
    expect(normalizeThemeInput({ theme })).toBe(theme);
    expect(normalizeThemeInput({ _config: { theme } })).toBe(theme);
    expect(normalizeThemeInput(undefined)).toBeUndefined();
    expect(normalizeThemeInput(null)).toBeUndefined();
  });

  it('prefers system config theme when both system and direct theme are present', () => {
    const systemTheme = { colors: { brand: { 500: '#222222' } } };
    const directTheme = { colors: { brand: { 500: '#111111' } } };

    expect(normalizeThemeInput({ theme: directTheme, _config: { theme: systemTheme } })).toBe(
      systemTheme
    );
  });

  it('returns the provided theme from defineTheme', () => {
    const theme = { fonts: { body: 'Arial, sans-serif' } };

    expect(defineTheme(theme)).toBe(theme);
  });
});

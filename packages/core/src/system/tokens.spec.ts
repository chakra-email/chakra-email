import { describe, expect, it } from 'vitest';
import { defaultTheme } from '../theme';
import type { EmailTheme, ThemeScale } from '../theme';
import {
  resolveColor,
  resolveFontFamily,
  resolveFontSize,
  resolveSpacing,
} from './tokens';

describe('token resolvers', () => {
  it('resolves user-supplied array scales by index', () => {
    const theme = { space: [0, 4, 8] };

    expect(resolveSpacing(2, theme)).toBe('8px');
    expect(resolveSpacing('2', theme)).toBe('8px');
    expect(resolveSpacing(15, theme)).toBe('15px');
  });

  it('degrades responsive values to their base value without throwing', () => {
    expect(resolveSpacing([2, 4] as unknown as number, defaultTheme)).toBe('8px');
    expect(
      resolveFontSize({ base: 'sm', md: 'md' } as unknown as string, defaultTheme)
    ).toBe('14px');
    expect(resolveSpacing({ md: 4 } as unknown as number, defaultTheme)).toBe('16px');
  });

  it('resolves unusable values to undefined instead of throwing', () => {
    expect(resolveSpacing([] as unknown as number, defaultTheme)).toBeUndefined();
    expect(resolveSpacing(Number.NaN, defaultTheme)).toBeUndefined();
    expect(resolveColor((() => '#fff') as unknown as string, defaultTheme)).toBeUndefined();
  });

  it('drops malformed values found in array-based theme scales', () => {
    const nullPrototypeValue = Object.create(null) as unknown as string;
    const theme = {
      colors: [nullPrototypeValue],
    };

    expect(
      resolveColor(0 as unknown as string, theme as unknown as EmailTheme)
    ).toBeUndefined();
  });

  it('drops unresolved and cyclic token references instead of leaking braces', () => {
    const theme = {
      tokens: {
        colors: {
          a: { value: '{colors.b}' },
          b: { value: '{colors.a}' },
        },
      },
    };

    expect(resolveColor('{colors.missing}', defaultTheme)).toBeUndefined();
    expect(resolveColor('a', theme)).toBeUndefined();
    expect(resolveColor('b', theme)).toBeUndefined();
  });

  it('resolves repeated references to the same token independently', () => {
    const theme = {
      tokens: {
        fonts: {
          system: { value: 'Arial' },
          repeated: { value: '{fonts.system}, {fonts.system}' },
        },
      },
    };

    expect(resolveFontFamily('repeated', theme)).toBe('Arial, Arial');
  });

  it('uses a valid fallback scale when a higher-priority token fails', () => {
    const theme = {
      tokens: {
        colors: {
          accent: { value: '{colors.missing}' },
        },
      },
      colors: {
        accent: '#123456',
      },
    };

    expect(resolveColor('accent', theme)).toBe('#123456');
  });

  it('does not append px to color or font family tokens', () => {
    expect(resolveColor('level', { colors: { level: 3 } })).toBe('3');
    expect(resolveFontFamily('stack', { fonts: { stack: 7 } })).toBe('7');
  });

  it('ignores inherited properties on theme scales', () => {
    const colors = Object.create({ danger: '#ff0000' }) as ThemeScale;

    expect(resolveColor('danger', { colors })).toBe('danger');
  });
});

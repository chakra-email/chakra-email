import { resolveColor, resolveBorder } from './tokens.js';
import { mapChakraPropsToStyles } from './style-props.js';
import { mergeRecipeStyles } from '../theme/recipes.js';
import type { EmailTheme } from '../theme/types.js';

const theme: EmailTheme = {
  tokens: {
    colors: { white: { value: '#fff' }, black: { value: '#111' } },
    borders: { subtle: { value: '1px solid {colors.fg}' } },
  },
  semanticTokens: {
    colors: {
      bg: {
        value: {
          base: '#ccc',
          _light: '{colors.white}',
          _dark: '{colors.black}',
        },
      },
      fg: { value: { _light: '{colors.black}', _dark: '{colors.white}' } },
      alias: { value: '{colors.bg}' },
      darkOnly: { value: { _dark: '#333' } },
      fallback: { value: { default: '#444' } },
      cycle: { value: '{colors.cycle}' },
    },
  },
};

describe('color-mode token resolution', () => {
  it('selects light and dark branches, including semantic aliases and composite references', () => {
    expect(resolveColor('bg', theme)).toBe('#fff');
    expect(resolveColor('alias', { ...theme, colorMode: 'dark' })).toBe('#111');
    expect(resolveBorder('subtle', { ...theme, colorMode: 'dark' })).toBe(
      '1px solid #fff',
    );
    expect(resolveColor('darkOnly', theme)).toBeUndefined();
    expect(resolveColor('darkOnly', { ...theme, colorMode: 'dark' })).toBe(
      '#333',
    );
    expect(resolveColor('fallback', { ...theme, colorMode: 'dark' })).toBe(
      '#444',
    );
    expect(
      resolveColor('cycle', { ...theme, colorMode: 'dark' }),
    ).toBeUndefined();
  });

  it('resolves shallow mode props without leaking them to inline CSS', () => {
    const props = {
      bg: 'bg',
      _light: { color: '#123' },
      _dark: { color: 'fg', bg: '#222' },
    };
    expect(mapChakraPropsToStyles(props, theme)).toEqual({
      backgroundColor: '#fff',
      color: '#123',
    });
    expect(
      mapChakraPropsToStyles(props, { ...theme, colorMode: 'dark' }),
    ).toEqual({ backgroundColor: '#222', color: '#fff' });
  });

  it('merges mode overrides across recipe layers', () => {
    expect(
      mergeRecipeStyles(
        { _dark: { color: '#fff', bg: '#111' } },
        { _dark: { bg: '#222' } },
      ),
    ).toEqual({ _dark: { color: '#fff', bg: '#222' } });
  });
});

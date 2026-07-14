import { describe, expect, it } from 'vitest';
import { defaultTheme } from '../theme';
import { mapChakraPropsToStyles } from './style-props';

describe('mapChakraPropsToStyles', () => {
  it('resolves Chakra-style theme tokens by prop category', () => {
    expect(
      mapChakraPropsToStyles(
        {
          bg: 'brand.500',
          color: 'gray.700',
          p: 6,
          fontSize: '2xl',
          fontWeight: 'semibold',
          borderRadius: 'md',
        },
        defaultTheme
      )
    ).toMatchObject({
      backgroundColor: '#6366f1',
      color: '#2D3748',
      padding: '24px',
      fontSize: '24px',
      fontWeight: 600,
      borderRadius: '6px',
    });
  });

  it('filters CSS that is unsafe for email output', () => {
    expect(
      mapChakraPropsToStyles(
        {
          display: 'flex',
          style: {
            boxShadow: '0 4px 12px black',
          },
        },
        defaultTheme
      )
    ).toEqual({
      display: 'block',
    });
  });

  it('degrades responsive array and object values to their base value', () => {
    expect(
      mapChakraPropsToStyles(
        {
          p: [2, 4] as unknown as number,
          fontSize: { base: 'sm', md: 'md' } as unknown as string,
          m: { md: 4 } as unknown as number,
        },
        defaultTheme
      )
    ).toMatchObject({
      padding: '8px',
      fontSize: '14px',
      margin: '16px',
    });
  });

  it('matches the Chakra spacing scale and falls back to raw px off scale', () => {
    expect(mapChakraPropsToStyles({ p: 14, m: 20, pt: 0.5, pb: 15 }, defaultTheme)).toMatchObject({
      padding: '56px',
      margin: '80px',
      paddingTop: '2px',
      paddingBottom: '15px',
    });
  });

  it('treats numeric strings like numbers', () => {
    expect(mapChakraPropsToStyles({ p: '4', mt: '15' }, defaultTheme)).toMatchObject({
      padding: '16px',
      marginTop: '15px',
    });
  });

  it('maps background to the CSS background shorthand', () => {
    const styles = mapChakraPropsToStyles(
      { background: 'url(x.png) no-repeat' },
      defaultTheme
    );

    expect(styles.background).toBe('url(x.png) no-repeat');
    expect(styles.backgroundColor).toBeUndefined();
  });

  it('drops declarations with unresolved token references', () => {
    const styles = mapChakraPropsToStyles(
      { bg: '{colors.missing}' },
      {
        semanticTokens: {
          colors: {
            danger: { value: '{colors.missing}' },
          },
        },
      }
    );

    expect(styles.backgroundColor).toBeUndefined();
  });

  it('resolves Chakra v3 token objects and token references', () => {
    expect(
      mapChakraPropsToStyles(
        {
          bg: 'surface',
          color: 'danger',
          p: 'gutter',
          border: 'danger',
          borderWidth: 'thin',
          letterSpacing: 'wide',
        },
        {
          tokens: {
            colors: {
              red: {
                500: { value: '#e53e3e' },
              },
              gray: {
                50: { value: '#f7fafc' },
              },
            },
            spacing: {
              gutter: { value: '20px' },
            },
            borders: {
              danger: { value: '1px solid {colors.red.500}' },
            },
            borderWidths: {
              thin: { value: '1px' },
            },
            letterSpacings: {
              wide: { value: '0.08em' },
            },
          },
          semanticTokens: {
            colors: {
              danger: { value: '{colors.red.500}' },
              surface: { value: { base: '{colors.gray.50}', _dark: '{colors.red.500}' } },
            },
          },
        }
      )
    ).toMatchObject({
      backgroundColor: '#f7fafc',
      color: '#e53e3e',
      padding: '20px',
      border: '1px solid #e53e3e',
      borderWidth: '1px',
      letterSpacing: '0.08em',
    });
  });
});

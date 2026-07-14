import { describe, expect, it } from 'vitest';
import {
  Body,
  ChakraEmailV2Provider,
  Container,
  Html,
  Text,
  adaptChakraV2Theme,
  createChakraV2EmailTheme,
  render,
} from './index';
import { mapChakraPropsToStyles } from './system';

describe('@chakra-email/chakra-v2 adapter edge cases', () => {
  describe('_dark-only semantic tokens', () => {
    // A v2 semantic token with only a `_dark` mode has no light-mode value,
    // and email output has no dark mode. The adapter must not let the raw
    // token name (or the dark-mode reference) leak into the CSS.
    const themeInput = {
      colors: { red: { 300: '#fc8181' } },
      semanticTokens: {
        colors: {
          nightOnly: { _dark: 'red.300' },
        },
      },
    };

    it('adapts the token to an empty value the renderer drops', () => {
      const theme = createChakraV2EmailTheme(themeInput);

      expect(mapChakraPropsToStyles({ color: 'nightOnly' }, theme)).toEqual({
        color: '',
      });
    });

    it('emits no color declaration at all in rendered output', async () => {
      const html = await render(
        <ChakraEmailV2Provider theme={themeInput}>
          <Html>
            <Body>
              <Text color="nightOnly">Night only.</Text>
            </Body>
          </Html>
        </ChakraEmailV2Provider>
      );

      expect(html).toContain('Night only.');
      // No invalid literal from the unresolved token name...
      expect(html).not.toContain('color:nightOnly');
      // ...and no accidental fallback to the dark-mode value.
      expect(html).not.toContain('red.300');
      expect(html).not.toContain('#fc8181');
    });
  });

  describe('semantic tokens referencing other semantic tokens', () => {
    const themeInput = {
      colors: { red: { 300: '#fc8181', 500: '#e53e3e' } },
      semanticTokens: {
        colors: {
          primary: { default: 'red.500', _dark: 'red.300' },
          danger: 'primary',
        },
      },
    };

    it('resolves the chain to the final hex value', () => {
      const theme = createChakraV2EmailTheme(themeInput);

      expect(mapChakraPropsToStyles({ color: 'danger' }, theme)).toEqual({
        color: '#e53e3e',
      });
    });

    it('renders the final hex value, never an intermediate literal', async () => {
      const html = await render(
        <ChakraEmailV2Provider theme={themeInput}>
          <Html>
            <Body>
              <Text color="danger">Chained.</Text>
            </Body>
          </Html>
        </ChakraEmailV2Provider>
      );

      expect(html).toContain('color:#e53e3e');
      expect(html).not.toContain('color:primary');
      expect(html).not.toContain('{colors.primary}');
    });

    it('drops circular semantic token chains instead of leaking literals', () => {
      const theme = createChakraV2EmailTheme({
        semanticTokens: {
          colors: {
            a: 'b',
            b: 'a',
          },
        },
      });

      expect(mapChakraPropsToStyles({ color: 'a' }, theme)).toEqual({
        color: '',
      });
    });
  });

  describe('numeric v2 scale values', () => {
    it('treats numeric space values as px', async () => {
      // Numbers instead of the usual rem strings, e.g. a styled-system theme.
      const themeInput = { space: { 4: 16, 8: 32 } };
      const theme = createChakraV2EmailTheme(themeInput);

      expect(mapChakraPropsToStyles({ p: 4 }, theme)).toEqual({
        padding: '16px',
      });
      expect(mapChakraPropsToStyles({ m: 8 }, theme)).toEqual({
        margin: '32px',
      });

      const html = await render(
        <ChakraEmailV2Provider theme={themeInput}>
          <Html>
            <Body>
              <Container p={4}>
                <Text>Numeric scale.</Text>
              </Container>
            </Body>
          </Html>
        </ChakraEmailV2Provider>
      );

      expect(html).toContain('padding:16px');
    });

    it('handles lineHeights mixing unitless numbers, rem strings, and px strings', () => {
      const theme = createChakraV2EmailTheme({
        lineHeights: {
          none: 1,
          base: 1.5,
          relaxed: '1.75rem',
          tall: '28px',
        },
      });

      // Unitless line-heights must stay unitless numbers.
      expect(mapChakraPropsToStyles({ lineHeight: 'none' }, theme)).toEqual({
        lineHeight: 1,
      });
      expect(mapChakraPropsToStyles({ lineHeight: 'base' }, theme)).toEqual({
        lineHeight: 1.5,
      });
      // rem converts at the 16px root font size; px passes through.
      expect(mapChakraPropsToStyles({ lineHeight: 'relaxed' }, theme)).toEqual({
        lineHeight: '28px',
      });
      expect(mapChakraPropsToStyles({ lineHeight: 'tall' }, theme)).toEqual({
        lineHeight: '28px',
      });
    });
  });

  describe('idempotence', () => {
    it('re-adapting an already-adapted theme changes nothing', () => {
      const original = {
        config: { initialColorMode: 'light' },
        components: { Button: { baseStyle: { fontWeight: 'bold' } } },
        colors: { red: { 300: '#fc8181', 500: '#e53e3e' } },
        space: { px: '1px', 4: '1rem', 8: 32 },
        sizes: { xs: '20rem', full: '100%' },
        lineHeights: { none: 1, relaxed: '1.75rem', tall: '28px' },
        semanticTokens: {
          colors: {
            nightOnly: { _dark: 'red.300' },
            primary: { default: 'red.500', _dark: 'red.300' },
            danger: 'primary',
            surface: '#fdfdfc',
          },
        },
      };

      const once = adaptChakraV2Theme(original);
      const twice = adaptChakraV2Theme(once);

      expect(twice).toStrictEqual(once);
      // And a third pass, since the provider may re-adapt on every render.
      expect(adaptChakraV2Theme(twice)).toStrictEqual(once);
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  Body,
  Button,
  ChakraEmailV2Provider,
  Container,
  Html,
  Text,
  adaptChakraV2Theme,
  createChakraV2EmailTheme,
  render,
} from './index';
import { mapChakraPropsToStyles } from './system';

// Shaped like `extendTheme` output from Chakra UI v2: rem-based length
// scales, mode-conditional semantic tokens, and runtime-only keys.
const legacyChakraV2Theme = {
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  direction: 'ltr',
  breakpoints: { base: '0em', sm: '30em', md: '48em', lg: '62em' },
  styles: { global: { body: { bg: 'white' } } },
  components: { Button: { baseStyle: { fontWeight: 'bold' } } },
  transition: { duration: { normal: '200ms' } },
  zIndices: { modal: 1400 },
  colors: {
    red: { 300: '#fc8181', 500: '#e53e3e' },
    teal: { 500: '#319795' },
    gray: { 50: '#f7fafc', 700: '#2d3748' },
  },
  space: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    2: '0.5rem',
    4: '1rem',
    6: '1.5rem',
    8: '2rem',
  },
  sizes: { xs: '20rem', full: '100%' },
  fontSizes: {
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
  lineHeights: { none: 1, base: 1.5, relaxed: '1.75rem' },
  letterSpacings: { tight: '-0.025em', widest: '0.1em' },
  radii: { sm: '0.125rem', md: '0.375rem', full: '9999px' },
  borders: { subtle: '0.0625rem solid #cbd5e0' },
  semanticTokens: {
    colors: {
      danger: { default: 'red.500', _dark: 'red.300' },
      accent: 'teal.500',
      surface: '#fdfdfc',
    },
  },
};

describe('@chakra-email/chakra-v2', () => {
  it('renders with a flat Chakra v2-style theme object', async () => {
    // Scale values intentionally differ from the built-in defaults so the
    // assertions fail if the user scale is ignored.
    const theme = createChakraV2EmailTheme({
      colors: {
        brand: {
          500: '#0055ff',
        },
        gray: {
          50: '#f8fafc',
          700: '#334155',
        },
      },
      space: [0, 2, 4, 6, 8, 10, 12],
    });

    expect(mapChakraPropsToStyles({ bg: 'brand.500', p: 6 }, theme)).toEqual({
      backgroundColor: '#0055ff',
      padding: '12px',
    });

    const html = await render(
      <ChakraEmailV2Provider theme={theme}>
        <Html>
          <Body bg="gray.50">
            <Container p={6}>
              <Text color="gray.700">Chakra v2 compatible.</Text>
              <Button href="https://example.com" bg="brand.500">
                Open
              </Button>
            </Container>
          </Body>
        </Html>
      </ChakraEmailV2Provider>,
    );

    expect(html).toContain('background-color:#f8fafc');
    expect(html).toContain('color:#334155');
    expect(html).toContain('background-color:#0055ff');
    expect(html).toContain('padding:12px');
  });

  it('converts rem/em length scales to px at a 16px root font size', () => {
    const theme = createChakraV2EmailTheme(legacyChakraV2Theme);

    expect(mapChakraPropsToStyles({ p: 0.5 }, theme)).toEqual({
      padding: '2px',
    });
    expect(mapChakraPropsToStyles({ p: 8 }, theme)).toEqual({
      padding: '32px',
    });
    expect(mapChakraPropsToStyles({ p: 'px' }, theme)).toEqual({
      padding: '1px',
    });
    expect(mapChakraPropsToStyles({ w: 'xs' }, theme)).toEqual({
      width: '320px',
    });
    expect(mapChakraPropsToStyles({ fontSize: 'sm' }, theme)).toEqual({
      fontSize: '14px',
    });
    expect(mapChakraPropsToStyles({ letterSpacing: 'tight' }, theme)).toEqual({
      letterSpacing: '-0.4px',
    });
    expect(mapChakraPropsToStyles({ rounded: 'md' }, theme)).toEqual({
      borderRadius: '6px',
    });
  });

  it('keeps unitless line-heights unitless and converts rem line-heights', () => {
    const theme = createChakraV2EmailTheme(legacyChakraV2Theme);

    expect(mapChakraPropsToStyles({ lineHeight: 'base' }, theme)).toEqual({
      lineHeight: 1.5,
    });
    expect(mapChakraPropsToStyles({ lineHeight: 'relaxed' }, theme)).toEqual({
      lineHeight: '28px',
    });
  });

  it('converts rem inside composite border strings', () => {
    const theme = createChakraV2EmailTheme(legacyChakraV2Theme);

    expect(mapChakraPropsToStyles({ border: 'subtle' }, theme)).toEqual({
      border: '1px solid #cbd5e0',
    });
  });

  it('resolves Chakra v2 semanticTokens through the default mode', () => {
    const theme = createChakraV2EmailTheme(legacyChakraV2Theme);

    // `{ default, _dark }` object form: uses `default`, ignores `_dark`.
    expect(mapChakraPropsToStyles({ color: 'danger' }, theme)).toEqual({
      color: '#e53e3e',
    });
    // Plain-string token reference form.
    expect(mapChakraPropsToStyles({ bg: 'accent' }, theme)).toEqual({
      backgroundColor: '#319795',
    });
    // Literal CSS values pass through untouched.
    expect(mapChakraPropsToStyles({ color: 'surface' }, theme)).toEqual({
      color: '#fdfdfc',
    });
  });

  it('drops non-visual Chakra v2 keys the resolver ignores', () => {
    const adapted = adaptChakraV2Theme(legacyChakraV2Theme);

    expect(adapted.components).toBeUndefined();
    expect(adapted.styles).toBeUndefined();
    expect(adapted.config).toBeUndefined();
    expect(adapted.breakpoints).toBeUndefined();
    expect(adapted.transition).toBeUndefined();
    expect(adapted.zIndices).toBeUndefined();
  });

  it('renders a raw extendTheme-shaped theme passed straight to the provider', async () => {
    const html = await render(
      <ChakraEmailV2Provider theme={legacyChakraV2Theme}>
        <Html>
          <Body bg="gray.50">
            <Container p={8}>
              <Text color="danger" fontSize="sm">
                Payment failed.
              </Text>
              <Button href="https://example.com" bg="accent" color="surface">
                Update billing
              </Button>
            </Container>
          </Body>
        </Html>
      </ChakraEmailV2Provider>,
    );

    expect(html).toContain('background-color:#f7fafc');
    expect(html).toContain('padding:32px');
    expect(html).toContain('color:#e53e3e');
    expect(html).toContain('font-size:14px');
    expect(html).toContain('background-color:#319795');
    expect(html).toContain('color:#fdfdfc');
  });
});

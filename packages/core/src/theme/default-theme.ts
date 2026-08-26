import type { EmailTheme } from './types.js';
import { chakraEmailRecipes } from './default-recipes.js';

/**
 * Chakra's spacing scale converted to px. Off-scale numbers fall back to raw
 * px values at resolution time.
 */
const spaceScale = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
};

export const defaultTheme: EmailTheme = {
  colors: {
    black: '#000000',
    white: '#ffffff',
    transparent: 'transparent',
    current: 'currentColor',
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923',
    },
    brand: {
      50: '#f5f7ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
  },
  semanticTokens: {
    colors: {
      bg: {
        DEFAULT: {
          value: { _light: '{colors.white}', _dark: '{colors.black}' },
        },
        subtle: {
          value: { _light: '{colors.gray.50}', _dark: '{colors.gray.900}' },
        },
        muted: {
          value: { _light: '{colors.gray.100}', _dark: '{colors.gray.800}' },
        },
      },
      fg: {
        DEFAULT: {
          value: { _light: '{colors.gray.900}', _dark: '{colors.gray.50}' },
        },
        muted: {
          value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' },
        },
      },
      border: {
        DEFAULT: {
          value: { _light: '{colors.gray.200}', _dark: '{colors.gray.700}' },
        },
      },
      accent: {
        DEFAULT: {
          value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' },
        },
        fg: {
          value: { _light: '{colors.brand.700}', _dark: '{colors.brand.200}' },
        },
        subtle: {
          value: { _light: '{colors.brand.100}', _dark: '{colors.brand.800}' },
        },
        contrast: {
          value: { _light: '{colors.white}', _dark: '{colors.white}' },
        },
      },
    },
  },
  space: spaceScale,
  spacing: spaceScale,
  sizes: {
    full: '100%',
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
  },
  fontWeights: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    heading:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    mono: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  },
  lineHeights: {
    none: 1,
    shorter: 1.25,
    short: 1.375,
    base: 1.5,
    tall: 1.625,
    taller: 2,
  },
  radii: {
    none: '0',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px',
  },
  borders: {
    none: 'none',
    base: '1px solid #E2E8F0',
  },
  recipes: chakraEmailRecipes,
};

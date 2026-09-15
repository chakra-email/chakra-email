export const chakraEmailSemanticColors = {
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
};

export const chakraEmailSemanticTokens = {
  colors: chakraEmailSemanticColors,
};

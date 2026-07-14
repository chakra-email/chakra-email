import {
  ThemeProvider,
  mergeTheme,
  type EmailTheme,
  type ThemeInput,
  type ThemeProviderProps,
} from '@chakra-email/core/theme';

export * from '@chakra-email/core/theme';

export type ChakraV3Theme = ThemeInput;
export type ChakraEmailProviderProps = ThemeProviderProps;

export function createChakraV3EmailTheme(theme: ChakraV3Theme): EmailTheme {
  return mergeTheme(theme);
}

export { ThemeProvider as ChakraEmailProvider };

import { createElement, type ReactNode } from 'react';
import {
  ThemeProvider,
  mergeTheme,
  type EmailTheme,
  type EmailColorMode,
  type ThemeInput,
} from '@chakra-email/core/theme';

export * from '@chakra-email/core/theme';

/**
 * Accepts both plain Chakra v3 theme configuration and the `SystemContext`
 * returned by Chakra UI's `createSystem`. The structural branch avoids making
 * Chakra UI a runtime dependency of the email adapter.
 */
export type ChakraV3Theme =
  | ThemeInput
  | {
      readonly _config: {
        readonly theme?: unknown;
      };
    };

export interface ChakraEmailProviderProps {
  colorMode?: EmailColorMode;
  theme?: ChakraV3Theme;
  children: ReactNode;
}

export function createChakraV3EmailTheme(theme: ChakraV3Theme): EmailTheme {
  return mergeTheme(theme as ThemeInput);
}

export function ChakraEmailProvider({
  theme,
  colorMode,
  children,
}: ChakraEmailProviderProps) {
  return createElement(ThemeProvider, {
    colorMode,
    theme: theme ? createChakraV3EmailTheme(theme) : undefined,
    children,
  });
}

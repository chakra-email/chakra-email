import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { defaultTheme } from './default-theme.js';
import { mergeTheme } from './merge-theme.js';
import type { EmailColorMode, EmailTheme, ThemeInput } from './types.js';

const ThemeContext = createContext<EmailTheme>(defaultTheme);

export interface ThemeProviderProps {
  theme?: ThemeInput | null;
  colorMode?: EmailColorMode;
  children: ReactNode;
}

export function ThemeProvider({
  theme,
  colorMode,
  children,
}: ThemeProviderProps) {
  const parentTheme = useContext(ThemeContext);
  const value = useMemo(() => {
    const merged = mergeTheme(theme, parentTheme);
    return colorMode ? { ...merged, colorMode } : merged;
  }, [theme, colorMode, parentTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): EmailTheme {
  return useContext(ThemeContext);
}

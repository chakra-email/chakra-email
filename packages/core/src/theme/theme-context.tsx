import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { defaultTheme } from './default-theme.js';
import { mergeTheme } from './merge-theme.js';
import type { EmailTheme, ThemeInput } from './types.js';

const ThemeContext = createContext<EmailTheme>(defaultTheme);

export interface ThemeProviderProps {
  theme?: ThemeInput | null;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const parentTheme = useContext(ThemeContext);
  const value = useMemo(
    () => mergeTheme(theme, parentTheme),
    [theme, parentTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): EmailTheme {
  return useContext(ThemeContext);
}

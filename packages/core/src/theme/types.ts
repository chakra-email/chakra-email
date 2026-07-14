export type ThemeScaleValue =
  | string
  | number
  | Array<string | number>
  | {
      value?:
        | string
        | number
        | Array<string | number>
        | Record<string, unknown>;
      [key: string]: unknown;
    };

export interface ThemeScale {
  [key: string]: ThemeScaleValue | ThemeScale;
}

export interface EmailTheme {
  tokens?: {
    colors?: ThemeScale;
    space?: Array<string | number> | ThemeScale;
    spacing?: Array<string | number> | ThemeScale;
    sizes?: ThemeScale;
    fontSizes?: ThemeScale;
    fontWeights?: ThemeScale;
    fonts?: ThemeScale;
    lineHeights?: ThemeScale;
    radii?: ThemeScale;
    borders?: ThemeScale;
    borderWidths?: ThemeScale;
    letterSpacings?: ThemeScale;
    [key: string]: ThemeScale | Array<string | number> | undefined;
  };
  colors?: ThemeScale;
  semanticTokens?: {
    colors?: ThemeScale;
    [key: string]: ThemeScale | undefined;
  };
  space?: Array<string | number> | ThemeScale;
  spacing?: Array<string | number> | ThemeScale;
  sizes?: ThemeScale;
  fontSizes?: ThemeScale;
  fontWeights?: ThemeScale;
  fonts?: ThemeScale;
  lineHeights?: ThemeScale;
  radii?: ThemeScale;
  borders?: ThemeScale;
  borderWidths?: ThemeScale;
  letterSpacings?: ThemeScale;
  [key: string]: unknown;
}

export type ThemeOverride = Partial<EmailTheme>;

export type ThemeInput =
  | ThemeOverride
  | {
      theme?: ThemeOverride;
      _config?: {
        theme?: ThemeOverride;
      };
    };

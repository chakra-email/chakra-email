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
  recipes?: Record<string, EmailRecipeDefinition>;
  slotRecipes?: Record<string, EmailSlotRecipeDefinition>;
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

export type RecipeVariantValue = string | number | boolean;

export type RecipeSelection = Record<
  string,
  RecipeVariantValue | null | undefined
>;

export type RecipeCondition =
  | RecipeVariantValue
  | readonly RecipeVariantValue[]
  | null
  | undefined;

export type EmailRecipeStyle =
  import('../system/style-props.js').ChakraEmailStyleProps;

export interface EmailRecipeDefinition {
  className?: string;
  base?: EmailRecipeStyle;
  variants?: Record<string, Record<string, EmailRecipeStyle>>;
  defaultVariants?: RecipeSelection;
  compoundVariants?: Array<
    { css: EmailRecipeStyle } & Record<
      string,
      RecipeCondition | EmailRecipeStyle
    >
  >;
}

export interface EmailSlotRecipeDefinition {
  className?: string;
  slots: readonly string[];
  base?: Record<string, EmailRecipeStyle>;
  variants?: Record<string, Record<string, Record<string, EmailRecipeStyle>>>;
  defaultVariants?: RecipeSelection;
  compoundVariants?: Array<
    { css: Record<string, EmailRecipeStyle> } & Record<
      string,
      RecipeCondition | Record<string, EmailRecipeStyle>
    >
  >;
}

/** Portable public configuration without Chakra's recursive system types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChakraEmailThemeConfigSection = Readonly<Record<string, any>>;

export interface ChakraEmailThemeConfig {
  readonly theme: {
    readonly recipes: ChakraEmailThemeConfigSection;
    readonly semanticTokens: ChakraEmailThemeConfigSection;
    readonly slotRecipes: ChakraEmailThemeConfigSection;
  };
}

import {
  chakraEmailRecipeKeys,
  chakraEmailSlotRecipeKeys,
  chakraEmailThemeConfig,
  defineRecipe,
  defineSlotRecipe,
  defineTheme,
  type ChakraEmailThemeConfig,
  type ThemeOverride,
} from 'chakra-email/theme';

export const sharedTheme: ThemeOverride = defineTheme({
  semanticTokens: {
    colors: {
      brand: { value: '#18181b' },
    },
  },
  recipes: {
    [chakraEmailRecipeKeys.text]: defineRecipe({
      base: { color: 'whiteAlpha.200' },
    }),
  },
  slotRecipes: {
    [chakraEmailSlotRecipeKeys.button]: defineSlotRecipe({
      slots: ['root', 'cell', 'link'],
      variants: {
        variant: {
          solid: {
            cell: { bg: 'brand' },
            link: { color: 'white' },
          },
        },
      },
    }),
  },
});

export const portableThemeConfig: ChakraEmailThemeConfig =
  chakraEmailThemeConfig;

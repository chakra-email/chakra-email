import { chakraEmailRecipes } from './default-recipes.js';
import { chakraEmailSemanticTokens } from './default-semantic-tokens.js';
import { chakraEmailSlotRecipes } from './default-slot-recipes.js';
import type { ChakraEmailThemeConfig } from './types.js';

/** Portable theme configuration for Chakra UI's `defineConfig`/`createSystem`. */
export const chakraEmailThemeConfig: ChakraEmailThemeConfig = {
  theme: {
    recipes: chakraEmailRecipes,
    semanticTokens: chakraEmailSemanticTokens,
    slotRecipes: chakraEmailSlotRecipes,
  },
};

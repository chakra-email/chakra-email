import { chakraEmailRecipes } from './default-recipes.js';
import { chakraEmailSemanticTokens } from './default-semantic-tokens.js';
import { chakraEmailSlotRecipes } from './default-slot-recipes.js';

/** Portable theme configuration for Chakra UI's `defineConfig`/`createSystem`. */
export const chakraEmailThemeConfig = {
  theme: {
    recipes: chakraEmailRecipes,
    semanticTokens: chakraEmailSemanticTokens,
    slotRecipes: chakraEmailSlotRecipes,
  },
};

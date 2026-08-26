import { describe, expect, it } from 'vitest';
import { chakraEmailThemeConfig } from './default-config';
import { chakraEmailRecipeKeys, chakraEmailRecipes } from './default-recipes';
import {
  chakraEmailSlotRecipeKeys,
  chakraEmailSlotRecipes,
} from './default-slot-recipes';

describe('default email recipe configuration', () => {
  it('exports every named single and slot recipe through the theme config', () => {
    expect(Object.keys(chakraEmailRecipes).sort()).toEqual(
      Object.values(chakraEmailRecipeKeys).sort(),
    );
    expect(Object.keys(chakraEmailSlotRecipes).sort()).toEqual(
      Object.values(chakraEmailSlotRecipeKeys).sort(),
    );
    expect(chakraEmailThemeConfig.theme.recipes).toBe(chakraEmailRecipes);
    expect(chakraEmailThemeConfig.theme.semanticTokens.colors).toHaveProperty(
      'accent',
    );
    expect(chakraEmailThemeConfig.theme.slotRecipes).toBe(
      chakraEmailSlotRecipes,
    );
  });

  it('uses portable semantic colors instead of direct palette references', () => {
    const recipes = JSON.stringify({
      recipes: chakraEmailRecipes,
      slotRecipes: chakraEmailSlotRecipes,
    });

    expect(recipes).not.toMatch(/(?:brand|gray)\./);
    expect(recipes).toContain('accent');
    expect(recipes).toContain('fg');
    expect(recipes).toContain('bg');
    expect(recipes).toContain('border');
  });
});

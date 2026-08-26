import {
  createPreviewSystem,
  previewSlotRecipeKeys,
  previewSlotRecipes,
  previewWorkspaceSlotRecipe,
} from './theme';

describe('preview UI theme', () => {
  it('registers a slot recipe for every public recipe key', () => {
    expect(Object.keys(previewSlotRecipes).sort()).toEqual(
      Object.values(previewSlotRecipeKeys).sort(),
    );
  });

  it('uses a neutral default palette', () => {
    const serialized = JSON.stringify(previewSlotRecipes);

    expect(serialized).not.toMatch(/teal|green|#16866c|#63d9bb/i);
  });

  it('merges consumer slot recipe overrides over the defaults', () => {
    const system = createPreviewSystem({
      slotRecipes: {
        [previewSlotRecipeKeys.workspace]: {
          base: { header: { bg: '#123456' } },
        },
      },
    });
    const recipe = system.getSlotRecipe(
      previewSlotRecipeKeys.workspace,
      previewWorkspaceSlotRecipe,
    );

    expect(recipe.base?.header).toMatchObject({ bg: '#123456' });
    expect(recipe.base?.root).toMatchObject({ bg: 'preview.canvas' });
  });
});

import {
  createPreviewSystem,
  previewSlotRecipeKeys,
  previewSlotRecipes,
  previewWorkspaceSlotRecipe,
  previewViewerSlotRecipe,
  previewFeedbackSlotRecipe,
} from './theme';

describe('preview UI theme', () => {
  it('keeps the canvas bounded and exposes panel and stage styling', () => {
    expect(previewWorkspaceSlotRecipe.base?.root).toMatchObject({
      h: '100dvh',
    });
    expect(previewWorkspaceSlotRecipe.base?.content).toMatchObject({
      minW: '0',
      minH: '0',
      flex: '1',
    });
    expect(previewWorkspaceSlotRecipe.base?.main).toMatchObject({
      display: 'flex',
      flexDirection: 'column',
      minH: '0',
    });
    expect(previewWorkspaceSlotRecipe.slots).toContain('inspectorPanel');
    expect(previewViewerSlotRecipe.slots).toContain('stage');
    expect(previewViewerSlotRecipe.base?.frame).toMatchObject({
      h: '100%',
      maxW: '100%',
      maxH: '100%',
      resize: 'both',
    });
  });
  it('registers a slot recipe for every public recipe key', () => {
    expect(Object.keys(previewSlotRecipes).sort()).toEqual(
      Object.values(previewSlotRecipeKeys).sort(),
    );
  });

  it('uses a neutral default palette', () => {
    const serialized = JSON.stringify(previewSlotRecipes);

    expect(serialized).not.toMatch(/teal|green|#16866c|#63d9bb/i);
  });

  it('inherits Chakra tooltip styling and exposes a shared surface/arrow override', () => {
    expect(previewFeedbackSlotRecipe.base?.tooltip).toEqual({ maxW: '260px' });
    const system = createPreviewSystem({
      slotRecipes: {
        [previewSlotRecipeKeys.feedback]: {
          base: {
            tooltip: { '--tooltip-bg': 'colors.gray.800', color: 'white' },
          },
        },
      },
    });
    const recipe = system.getSlotRecipe(
      previewSlotRecipeKeys.feedback,
      previewFeedbackSlotRecipe,
    );
    expect(recipe.base?.tooltip).toMatchObject({
      maxW: '260px',
      '--tooltip-bg': 'colors.gray.800',
      color: 'white',
    });
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

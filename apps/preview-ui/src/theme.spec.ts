import {
  createPreviewSystem,
  previewSlotRecipeKeys,
  previewSlotRecipes,
  previewWorkspaceSlotRecipe,
  previewViewerSlotRecipe,
  previewFeedbackSlotRecipe,
  previewTheme,
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
    expect(previewViewerSlotRecipe.base?.tabs).toMatchObject({
      borderWidth: '1px',
      borderRadius: 'md',
      gap: '0.5',
    });
    expect(previewViewerSlotRecipe.base?.surface).toMatchObject({
      bg: 'preview.canvas',
    });
    expect(previewViewerSlotRecipe.base?.frame).toMatchObject({
      h: '842px',
      maxW: 'none',
      maxH: 'none',
      resize: 'both',
    });
  });
  it('registers a slot recipe for every public recipe key', () => {
    expect(Object.keys(previewSlotRecipes).sort()).toEqual(
      Object.values(previewSlotRecipeKeys).sort(),
    );
  });

  it('keeps severity text at WCAG AA contrast on panel and chrome in both modes', () => {
    const palette = previewTheme.theme?.semanticTokens?.colors?.[
      'preview'
    ] as Record<string, { value: { _light: string; _dark: string } }>;
    const rgb = (value: string): number[] =>
      value.startsWith('#')
        ? [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16))
        : (value.match(/[\d.]+/gu) ?? []).map(Number);
    const luminance = (color: number[]) =>
      color
        .slice(0, 3)
        .map((component) => component / 255)
        .map((component) =>
          component <= 0.04045
            ? component / 12.92
            : ((component + 0.055) / 1.055) ** 2.4,
        )
        .reduce(
          (sum, component, i) => sum + component * [0.2126, 0.7152, 0.0722][i],
          0,
        );
    for (const mode of ['_light', '_dark'] as const) {
      for (const token of ['success', 'info', 'warning', 'danger']) {
        for (const surface of ['panel', 'chrome']) {
          const foreground = luminance(rgb(palette[token].value[mode]));
          const backgroundRgb = rgb(palette[surface].value[mode]);
          const canvas = rgb(palette['canvas'].value[mode]);
          const background = luminance(
            backgroundRgb.length === 4
              ? backgroundRgb
                  .slice(0, 3)
                  .map(
                    (component, i) =>
                      component * backgroundRgb[3] +
                      canvas[i] * (1 - backgroundRgb[3]),
                  )
              : backgroundRgb,
          );
          expect(
            (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05),
            token + ' on ' + surface + ' ' + mode,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('uses a neutral default palette', () => {
    const serialized = JSON.stringify(previewSlotRecipes);

    expect(serialized).not.toMatch(/teal|green|#16866c|#63d9bb/i);
  });

  it('shares accessible icon-button sizing through the feedback recipe', () => {
    expect(previewFeedbackSlotRecipe.slots).toContain('iconButton');
    expect(previewFeedbackSlotRecipe.base?.iconButton).toMatchObject({
      '--preview-icon-button-size': { base: '44px', md: '32px' },
      minW: 'var(--preview-icon-button-size)',
      minH: 'var(--preview-icon-button-size)',
      p: '0',
    });
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

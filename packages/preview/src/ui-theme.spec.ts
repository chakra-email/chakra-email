import { previewSlotRecipeKeys } from './ui-theme.js';

describe('preview UI theme contract', () => {
  it('exports stable keys for every customizable preview region', () => {
    expect(previewSlotRecipeKeys).toEqual({
      feedback: 'chakraEmailPreviewFeedback',
      inspector: 'chakraEmailPreviewInspector',
      templates: 'chakraEmailPreviewTemplates',
      viewer: 'chakraEmailPreviewViewer',
      workspace: 'chakraEmailPreviewWorkspace',
    });
  });
});

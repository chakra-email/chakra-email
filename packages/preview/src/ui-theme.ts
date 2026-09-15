export const previewSlotRecipeKeys = {
  feedback: 'chakraEmailPreviewFeedback',
  inspector: 'chakraEmailPreviewInspector',
  templates: 'chakraEmailPreviewTemplates',
  viewer: 'chakraEmailPreviewViewer',
  workspace: 'chakraEmailPreviewWorkspace',
} as const;

export type PreviewSlotRecipeKey =
  (typeof previewSlotRecipeKeys)[keyof typeof previewSlotRecipeKeys];

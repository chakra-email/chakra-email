import { describe, expect, it } from 'vitest';
import {
  compatibilityReferenceForRule,
  previewCompatibilityReferences,
} from './compatibility.js';

describe('preview compatibility references', () => {
  it('provides stable upstream links without copying volatile percentages', () => {
    expect(compatibilityReferenceForRule('css-font-face')).toEqual(
      expect.objectContaining({
        source: 'Can I Email',
        url: 'https://www.caniemail.com/features/css-at-font-face/',
      }),
    );
    expect(compatibilityReferenceForRule('not-catalogued')).toBeUndefined();
    expect(JSON.stringify(previewCompatibilityReferences)).not.toMatch(/%/u);
  });
});

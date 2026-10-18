import { describe, expect, it } from 'vitest';
import { buildVariantSnippet } from './variant';

describe('buildVariantSnippet', () => {
  it('includes only changed nested keys with single quotes and two-space indentation', () => {
    expect(
      buildVariantSnippet(
        'Expired code',
        { values: { code: '482 913', name: 'Ada' }, active: true },
        { values: { code: '000 000', name: 'Ada' }, active: true },
      ),
    ).toBe("'Expired code': {\n  values: {\n    code: '000 000',\n  },\n},\n");
  });

  it('handles arrays, null, booleans, new keys, and object key ordering', () => {
    expect(
      buildVariantSnippet(
        ' Variant 2 ',
        { same: { a: 1, b: 2 }, tags: ['a'] },
        {
          same: { b: 2, a: 1 },
          tags: ['b'],
          optional: null,
          active: false,
          count: 0,
        },
      ),
    ).toBe(
      "'Variant 2': {\n  tags: [\n    'b',\n  ],\n  optional: null,\n  active: false,\n  count: 0,\n},\n",
    );
  });

  it('escapes names, values, control characters, backslashes, and non-identifier keys', () => {
    expect(
      buildVariantSnippet(
        "Ada's \\ test",
        {},
        { 'with spaces': 'It\'s "quoted"\n\\' },
      ),
    ).toBe(
      "'Ada\\'s \\\\ test': {\n  'with spaces': 'It\\'s \"quoted\"\\n\\\\',\n},\n",
    );
  });

  it('copies an empty entry for unchanged props and rejects empty names', () => {
    expect(buildVariantSnippet('Same', { value: 1 }, { value: 1 })).toBe(
      "'Same': {},\n",
    );
    expect(() => buildVariantSnippet('  ', {}, {})).toThrow('Enter a name');
  });
});

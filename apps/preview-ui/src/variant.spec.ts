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

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects reserved variant name %s',
    (name) => {
      expect(() => buildVariantSnippet(` ${name} `, {}, {})).toThrow(
        'is reserved',
      );
    },
  );

  it('rejects omitted fixture keys and empty-object replacements that cannot round-trip', () => {
    const base = { values: { code: '1', name: 'Ada' } };
    expect(() =>
      buildVariantSnippet('Removed', base, { values: { code: '2' } }),
    ).toThrow('cannot remove fixture keys (values.name)');
    expect(() => buildVariantSnippet('Empty', base, { values: {} })).toThrow(
      'cannot remove fixture keys (values.code)',
    );
    expect(() =>
      buildVariantSnippet('Root removal', { optional: true }, {}),
    ).toThrow('cannot remove fixture keys (optional)');
  });

  it('allows atomic array replacements and object/null type changes without mistaking them for removed keys', () => {
    expect(
      buildVariantSnippet(
        'Array replacement',
        { values: [{ code: '1', name: 'Ada' }] },
        { values: [{ code: '2' }] },
      ),
    ).toBe(
      "'Array replacement': {\n  values: [\n    {\n      code: '2',\n    },\n  ],\n},\n",
    );
    expect(
      buildVariantSnippet('Empty array', { values: ['1'] }, { values: [] }),
    ).toBe("'Empty array': {\n  values: [],\n},\n");
    expect(
      buildVariantSnippet(
        'Null',
        { values: { name: 'Ada' } },
        { values: null },
      ),
    ).toBe("'Null': {\n  values: null,\n},\n");
    expect(
      buildVariantSnippet('New empty object', { values: null }, { values: {} }),
    ).toBe("'New empty object': {\n  values: {},\n},\n");
  });
});

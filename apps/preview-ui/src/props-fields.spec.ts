import { describe, expect, it } from 'vitest';
import { createPropsFields, updatePropsField } from './props-fields';

describe('props field model', () => {
  it('preserves number and nullable types across drafts without losing nested siblings', () => {
    const text = JSON.stringify({
      values: { count: 2, note: null, active: true },
    });
    const fields = createPropsFields(text) ?? [];
    const emptyNumber = updatePropsField(text, fields[0], '');
    expect(emptyNumber.text).toBe(text);
    expect(emptyNumber.field).toMatchObject({
      type: 'number',
      value: '',
      error: 'Enter a finite number.',
    });
    const number = updatePropsField(text, emptyNumber.field, '-2.5e2');
    expect(JSON.parse(number.text)).toEqual({
      values: { count: -250, note: null, active: true },
    });
    const note = updatePropsField(number.text, fields[1], 'temporary');
    const clearedNote = updatePropsField(note.text, note.field, '');
    expect(JSON.parse(clearedNote.text).values.note).toBeNull();
    expect(clearedNote.field.type).toBe('null');
    expect(
      JSON.parse(updatePropsField(clearedNote.text, fields[2], false).text)
        .values.active,
    ).toBe(false);
  });

  it.each(['', ' ', '0x10', 'Infinity', 'NaN', '1e309', '1.', '01', '+1', '-'])(
    'retains the last valid JSON for invalid numeric draft %j',
    (draft) => {
      const text = '{"count":1}';
      const result = updatePropsField(
        text,
        (createPropsFields(text) ?? [])[0],
        draft,
      );
      expect(result.text).toBe(text);
      expect(result.field.error).toBeTruthy();
    },
  );

  it('falls back to JSON for arrays, empty objects, unsafe paths and large or invalid shapes', () => {
    for (const text of [
      '{}',
      '[]',
      '{"empty":{}}',
      '{"items":[]}',
      '{"nested":{"items":[1]}}',
      '{"__proto__":{"x":1}}',
      '{"constructor":1}',
      '{"prototype":1}',
      'null',
      '3',
      'true',
      '{',
      '{"large":1e400}',
    ])
      expect(createPropsFields(text)).toBeNull();
    expect(
      createPropsFields(
        JSON.stringify(
          Object.fromEntries(
            Array.from({ length: 20 }, (_, index) => ['p' + index, index]),
          ),
        ),
      ),
    ).toHaveLength(20);
    expect(
      createPropsFields(
        JSON.stringify(
          Object.fromEntries(
            Array.from({ length: 21 }, (_, index) => ['p' + index, index]),
          ),
        ),
      ),
    ).toBeNull();
  });

  it('only updates own existing safe paths without prototype traversal', () => {
    expect(() =>
      updatePropsField(
        '{}',
        { path: ['__proto__', 'polluted'], type: 'string', value: '' },
        'yes',
      ),
    ).toThrow('no longer available');
    expect(() =>
      updatePropsField(
        '{"a":null}',
        { path: ['a', 'b'], type: 'string', value: '' },
        'yes',
      ),
    ).toThrow('no longer available');
    expect(() =>
      updatePropsField(
        '{}',
        { path: ['missing'], type: 'string', value: '' },
        'yes',
      ),
    ).toThrow('no longer available');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

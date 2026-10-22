import { parseLintSummary } from './lint-summary';

describe('lint summary event validation', () => {
  it('accepts empty and complete summaries without carrying arbitrary properties', () => {
    expect(parseLintSummary({ generation: 1, templates: [] })).toEqual({
      generation: 1,
      templates: [],
    });
    expect(
      parseLintSummary({
        generation: 2,
        templates: [
          { id: 'welcome', error: 0, warning: 2, info: 1, extra: 'ignored' },
        ],
      }),
    ).toEqual({
      generation: 2,
      templates: [{ id: 'welcome', error: 0, warning: 2, info: 1 }],
    });
  });
  it.each([
    null,
    [],
    {},
    { generation: 0, templates: [] },
    { generation: Infinity, templates: [] },
    { generation: 1, templates: [{ id: 'a', error: -1, warning: 0, info: 0 }] },
    {
      generation: 1,
      templates: [{ id: 'a', error: 0, warning: '2', info: 0 }],
    },
    {
      generation: 1,
      templates: [{ id: 'a', error: 0, warning: 0.5, info: 0 }],
    },
    { generation: 1, templates: [null] },
    { generation: 1, templates: [{ id: '', error: 0, warning: 0, info: 0 }] },
    {
      generation: 1,
      templates: [
        { id: 'a', error: 0, warning: 0, info: 0 },
        { id: 'a', error: 0, warning: 0, info: 0 },
      ],
    },
  ])('ignores malformed summaries %#', (payload) => {
    expect(parseLintSummary(payload)).toBeUndefined();
  });
});

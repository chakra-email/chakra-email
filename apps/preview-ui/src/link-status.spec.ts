import { formatLinkStatus, parseLinkCheckEntries } from './link-status';

describe('per-link result validation', () => {
  it('accepts legacy absent metadata and actual HTTP and no-response outcomes', () => {
    expect(parseLinkCheckEntries(undefined)).toBeUndefined();
    const links = [
      { index: 0, line: 1, column: 4, status: 'ok', statusCode: 204 },
      { index: 1, status: 'redirect', statusCode: 308 },
      { index: 2, status: 'broken', statusCode: 404 },
      { index: 3, status: 'unverified', statusCode: 405 },
      { index: 4, status: 'unverified' },
      { index: 5, status: 'skipped' },
    ];
    expect(parseLinkCheckEntries(links)).toEqual(links);
    expect(parseLinkCheckEntries([])).toEqual([]);
  });

  it.each(
    [
      null,
      {},
      [null],
      [[]],
      [{ index: '0', status: 'skipped' }],
      [{ index: -1, status: 'skipped' }],
      [{ index: 0.5, status: 'skipped' }],
      [{ index: Number.MAX_SAFE_INTEGER + 1, status: 'skipped' }],
      [{ index: 0, status: 'unknown' }],
      [{ index: 0, status: ['ok'], statusCode: 200 }],
      [{ index: 0, status: 'skipped', line: 0 }],
      [{ index: 0, status: 'skipped', column: -1 }],
      [{ index: 0, status: 'skipped', line: 1.2 }],
      [{ index: 0, status: 'skipped', column: '4' }],
      [{ index: 0, status: 'unverified', statusCode: 0 }],
      [{ index: 0, status: 'unverified', statusCode: 600 }],
      [{ index: 0, status: 'unverified', statusCode: '404' }],
      [{ index: 0, status: 'unverified', statusCode: NaN }],
      [{ index: 0, status: 'ok' }],
      [{ index: 0, status: 'ok', statusCode: 404 }],
      [{ index: 0, status: 'redirect' }],
      [{ index: 0, status: 'redirect', statusCode: 200 }],
      [{ index: 0, status: 'skipped', statusCode: 200 }],
      [
        { index: 0, status: 'skipped' },
        { index: 0, status: 'unverified' },
      ],
    ].map((value) => [value]),
  )('rejects malformed metadata %j', (value) => {
    expect(() => parseLinkCheckEntries(value)).toThrow(
      'invalid per-link results',
    );
  });
});

describe('per-link status labels', () => {
  it('does not infer successful checks from a missing result', () => {
    expect(formatLinkStatus()).toBe('not checked');
    expect(formatLinkStatus({ index: 0, status: 'ok' })).toBe('unverified');
  });

  it('preserves actual HTTP success and redirect codes', () => {
    expect(formatLinkStatus({ index: 0, status: 'ok', statusCode: 204 })).toBe(
      '204',
    );
    expect(
      formatLinkStatus({ index: 1, status: 'redirect', statusCode: 308 }),
    ).toBe('→ 308');
    expect(formatLinkStatus({ index: 1, status: 'redirect' })).toBe('redirect');
  });

  it('keeps broken, skipped, and unverified outcomes distinct', () => {
    expect(
      formatLinkStatus({ index: 0, status: 'broken', statusCode: 410 }),
    ).toBe('broken');
    expect(formatLinkStatus({ index: 1, status: 'skipped' })).toBe('skipped');
    expect(formatLinkStatus({ index: 2, status: 'unverified' })).toBe(
      'unverified',
    );
    expect(
      formatLinkStatus({ index: 3, status: 'unverified', statusCode: 405 }),
    ).toBe('unverified (405)');
  });
});

import { createEmailLinkChecker, normalizeLinkCheck } from './check-links.js';
import { requestLinkHead } from './link-network.js';

vi.mock('./link-network.js', () => ({ requestLinkHead: vi.fn() }));
const head = vi.mocked(requestLinkHead);
const options = { allowedHosts: ['example.org'] };

describe('explicit email link checks', () => {
  beforeEach(() => {
    head.mockReset();
  });

  it('reports broken links and redirects with HTML locations, without following redirects', async () => {
    head.mockImplementation(async (url) =>
      url.pathname === '/missing'
        ? { status: 404 }
        : { status: 308, location: 'http://127.0.0.1/private?token=secret' },
    );
    const result = await createEmailLinkChecker(options)(
      '<a href="https://example.org/missing">Missing</a>\n<a href="https://example.org/moved">Moved</a>',
    );
    expect(result).toMatchObject({
      checked: 2,
      skipped: 0,
      findings: [
        { ruleId: 'link-broken', severity: 'error', line: 1 },
        { ruleId: 'link-redirect', severity: 'info', line: 2 },
      ],
    });
    expect(result.findings[1].suggestion).toContain('?[redacted]');
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(head).toHaveBeenCalledTimes(2);
    expect(
      head.mock.calls.every(([url]) => url.hostname === 'example.org'),
    ).toBe(true);
  });

  it.each([200, 204, 301, 302, 307, 308, 403, 405, 410, 429, 500])(
    'classifies HTTP %i',
    async (status) => {
      head.mockResolvedValue({ status });
      const result = await createEmailLinkChecker(options)(
        '<a href="https://example.org/page">Page</a>',
      );
      expect(result.findings[0]?.ruleId).toBe(
        status < 300
          ? undefined
          : status < 400
            ? 'link-redirect'
            : status === 410
              ? 'link-broken'
              : 'link-unverified',
      );
      expect(head).toHaveBeenCalledTimes(1);
    },
  );

  it('skips sensitive, excluded, malformed, non-HTTP and non-allowlisted URLs without requests', async () => {
    const urls = [
      'https://example.org/unsubscribe',
      'https://example.org/%2575nsubscribe',
      'https://example.org/page?code=secret',
      'https://example.org/login',
      'https://example.org/skip',
      'https://other.org/',
      'mailto:user@example.org',
      '/relative',
      '#section',
      'https://user:pass@example.org/',
      'https://example.org:444/',
      ' https://example.org/',
      'https://example.org/%zz',
    ];
    const result = await createEmailLinkChecker({
      ...options,
      excludedUrls: ['https://example.org/skip'],
    })(urls.map((url) => `<a href="${url}">Link</a>`).join('\n'));
    expect(result.skipped).toBe(urls.length);
    expect(result.checked).toBe(0);
    expect(head).not.toHaveBeenCalled();
  });

  it('deduplicates requests, preserves repeated locations and caches results', async () => {
    head.mockResolvedValue({ status: 404 });
    const check = createEmailLinkChecker(options);
    const html =
      '<a href="https://example.org/page">A</a>\n<a href="https://example.org/page">B</a>';
    expect((await check(html)).findings.map((finding) => finding.line)).toEqual(
      [1, 2],
    );
    await check(html);
    expect(head).toHaveBeenCalledTimes(1);
  });

  it('bounds requests and does not cache indefinitely', async () => {
    head.mockResolvedValue({ status: 200 });
    const check = createEmailLinkChecker({
      ...options,
      maxUrls: 1,
      cacheTtlMs: 0,
    });
    const html =
      '<a href="https://example.org/a">A</a><a href="https://example.org/b">B</a>';
    expect(await check(html)).toMatchObject({ checked: 1, skipped: 1 });
    await check(html);
    expect(head).toHaveBeenCalledTimes(2);
  });

  it('reports network errors without exposing underlying error details', async () => {
    head.mockRejectedValue(new Error('secret internal network details'));
    const result = await createEmailLinkChecker(options)(
      '<a href="https://example.org/">Page</a>',
    );
    expect(result.findings[0].ruleId).toBe('link-unverified');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('rejects concurrent checks and oversized HTML', async () => {
    let finish!: (value: { status: number }) => void;
    head.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const check = createEmailLinkChecker(options);
    const first = check('<a href="https://example.org/">Page</a>');
    await expect(check('')).rejects.toThrow('already running');
    finish({ status: 200 });
    await first;
    await expect(check('x'.repeat(2 * 1024 * 1024 + 1))).rejects.toThrow(
      'too large',
    );
  });

  it('validates explicit allowlists and bounded limits', () => {
    for (const allowedHosts of [
      [],
      ['*.example.org'],
      ['localhost:80'],
      ['127.1'],
      ['example.org/path'],
    ]) {
      expect(() => normalizeLinkCheck({ allowedHosts })).toThrow();
    }
    expect(() =>
      normalizeLinkCheck({ ...options, timeoutMs: Infinity }),
    ).toThrow();
    expect(() => normalizeLinkCheck({ ...options, maxUrls: 101 })).toThrow();
    expect(
      normalizeLinkCheck({ allowedHosts: ['EXAMPLE.ORG'] }).allowedHosts,
    ).toEqual(['example.org']);
  });
});

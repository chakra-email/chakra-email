import { describe, expect, it, vi } from 'vitest';
import { searchHandler } from './search';
import { getDocsManifest, getExamples } from './content';

describe('server documentation content and search', () => {
  it('loads real documentation and example sources without raw browser imports', async () => {
    expect((await getDocsManifest()).pages.length).toBe(10);
    const examples = await getExamples();
    expect(examples).toHaveLength(4);
    for (const example of examples) expect(example.source).toMatch(/export/);
  });
  it('returns bounded compact results with safe cache headers', async () => {
    const response = await searchHandler(
      new Request('https://chakra.email/api/docs/search?q=render'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=300');
    const result = await response.json();
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.length).toBeLessThanOrEqual(20);
    expect(result.results[0]).not.toHaveProperty('text');
    expect(result.results[0]).not.toHaveProperty('body');
  });
  it('handles empty queries, rejects oversized queries and unsupported methods', async () => {
    const url = 'https://chakra.email/api/docs/search';
    expect((await searchHandler(new Request(url))).status).toBe(200);
    expect(
      (await searchHandler(new Request(`${url}?q=${'x'.repeat(201)}`))).status,
    ).toBe(400);
    expect(
      (await searchHandler(new Request(url, { method: 'POST' }))).status,
    ).toBe(405);
  });
  it('caches the production manifest and search engine', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(getDocsManifest()).toBe(getDocsManifest());
      for (let i = 0; i < 2; i++)
        expect(
          (
            await searchHandler(
              new Request('https://chakra.email/api/docs/search?q=theme'),
            )
          ).status,
        ).toBe(200);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

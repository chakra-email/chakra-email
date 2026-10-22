import { afterEach, describe, expect, it, vi } from 'vitest';
import * as content from './server/content';
import { createDiscoveryFiles, discoveryResponse } from './server/discovery';
import { createSiteDocPages } from './doc-pages';
import { docsManifest } from './test/content';
import { createSiteLlmsText } from './llms';

describe('LLM documentation files', () => {
  afterEach(() => vi.restoreAllMocks());
  it('uses complete server-loaded sources for both discovery files', async () => {
    const files = await createDiscoveryFiles();
    expect(files['llms.txt']).toBe(createSiteLlmsText(docsManifest));
    expect(files['llms-full.txt']).toBe(
      createSiteLlmsText(docsManifest, '/', true),
    );
    expect(files['llms.txt']).toMatch(/^# Chakra Email\n/);
    for (const page of docsManifest.pages) {
      expect(files['llms.txt']).toContain(
        `](https://chakra.email${page.route})`,
      );
      expect(files['llms-full.txt']).toContain(page.body?.trim());
    }
  });
  it('keeps discovery links under an explicitly configured base', async () => {
    const files = await createDiscoveryFiles('/email/');
    expect(files['llms.txt']).toContain(
      'https://chakra.email/email/llms-full.txt',
    );
    expect(files['llms-full.txt']).toContain(
      'Source: https://chakra.email/email/docs/getting-started',
    );
  });
  it('excludes draft and hidden content from both files', () => {
    const pages = ['draft', 'hidden'].map((flag) => ({
      ...docsManifest.pages[0],
      id: flag,
      route: `/docs/${flag}`,
      frontmatter: { [flag]: true },
      body: `private-${flag}-body`,
    }));
    for (const full of [false, true])
      expect(
        createSiteLlmsText(
          { ...docsManifest, pages: [...docsManifest.pages, ...pages] },
          '/',
          full,
        ),
      ).not.toMatch(/private-(draft|hidden)-body|\/docs\/(draft|hidden)/);
  });
  it('fails instead of silently omitting a missing documentation source', () => {
    expect(() => createSiteDocPages({})).toThrow(
      'Missing documentation source',
    );
  });
  it.each(['llms.txt', 'llms-full.txt', 'sitemap.xml', 'robots.txt'] as const)(
    'serves %s through a native Response with the correct content type',
    async (file) => {
      // Source parsing is covered above. HTTP contracts reuse that real fixture,
      // keeping coverage runs bounded on the small shared CI runner.
      vi.spyOn(content, 'getDocsManifest').mockResolvedValue(docsManifest);
      const response = await discoveryResponse(file);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        file === 'sitemap.xml'
          ? 'application/xml; charset=utf-8'
          : 'text/plain; charset=utf-8',
      );
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect((await response.text()).length).toBeGreaterThan(50);
    },
  );
});

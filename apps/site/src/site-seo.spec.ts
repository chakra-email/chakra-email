import { createSitemapEntries } from '@chakra-docs/core';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { createDiscoveryFiles } from '../discovery-plugin';
import { docsManifest } from './docs';
import { SITE_URL } from './site-metadata';
import { createSiteRobots, createSiteSitemap } from './site-seo';

function locations(xml: string) {
  const document = new JSDOM(xml, { contentType: 'application/xml' }).window
    .document;
  expect(document.documentElement.namespaceURI).toBe(
    'http://www.sitemaps.org/schemas/sitemap/0.9',
  );
  return [...document.querySelectorAll('loc')].map(
    (element) => element.textContent,
  );
}

describe('search engine discovery', () => {
  it('generates valid XML containing every public page and no capture or alias routes', async () => {
    const files = await createDiscoveryFiles();
    expect(files['sitemap.xml']).toBe(createSiteSitemap(docsManifest));
    expect(files['robots.txt']).toBe(createSiteRobots());
    const urls = locations(files['sitemap.xml']);
    expect(urls).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/examples`,
      `${SITE_URL}/packages`,
      `${SITE_URL}/withoss`,
      ...docsManifest.sitemap.map(({ url }) => `${SITE_URL}${url}`),
    ]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).not.toContain(`${SITE_URL}/docs`);
    expect(files['sitemap.xml']).not.toMatch(
      /og-image|social-image|llms|localhost|\.test/,
    );
  });

  it('excludes drafts and hidden docs and deduplicates canonical URLs', () => {
    const pages = ['draft', 'hidden'].map((flag) => ({
      ...docsManifest.pages[0],
      id: flag,
      route: `/docs/${flag}`,
      frontmatter: { [flag]: true },
    }));
    const sitemap = createSitemapEntries([...docsManifest.pages, ...pages], {});
    const xml = createSiteSitemap({
      ...docsManifest,
      sitemap: [...sitemap, sitemap[0]],
    });
    expect(xml).not.toMatch(/\/docs\/(draft|hidden)/);
    const urls = locations(xml);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBe(docsManifest.pages.length + 4);
  });

  it('escapes XML and removes query strings and fragments without accepting foreign hosts', () => {
    const manifest = {
      ...docsManifest,
      sitemap: [{ url: '/docs/a&b?tracking=1#install' }],
    };
    const xml = createSiteSitemap(manifest);
    expect(xml).toContain('a&amp;b');
    expect(locations(xml)).toContain(`${SITE_URL}/docs/a&b`);
    expect(xml).not.toMatch(/tracking|#install/);
    for (const url of [
      'https://evil.example/docs',
      '//evil.example/docs',
      '/\\evil.example/docs',
      'docs/setup',
    ]) {
      expect(() =>
        createSiteSitemap({ ...docsManifest, sitemap: [{ url }] }),
      ).toThrow('local site routes');
    }
  });

  it('advertises the canonical sitemap, blocks HTML captures, and allows generated social images', () => {
    const robots = createSiteRobots();
    expect(robots).toBe(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /og-image',
        'Disallow: /social-image',
        'Disallow: /*/social-image',
        'Allow: /social-image.png',
        'Allow: /*/social-image.png',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
      ].join('\n'),
    );
  });

  it('respects the deployment base in sitemap entries and robots directives', async () => {
    const files = await createDiscoveryFiles('/email/');
    const urls = locations(files['sitemap.xml']);
    expect(urls).toContain(`${SITE_URL}/email/`);
    expect(urls).toContain(`${SITE_URL}/email/docs/getting-started`);
    expect(urls.every((url) => url?.startsWith(`${SITE_URL}/email/`))).toBe(
      true,
    );
    expect(files['robots.txt']).toContain(
      `Sitemap: ${SITE_URL}/email/sitemap.xml`,
    );
    expect(files['robots.txt']).toContain('Disallow: /email/*/social-image');
    expect(files['robots.txt']).toContain('Allow: /email/*/social-image.png');
  });
});

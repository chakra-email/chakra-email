import { describe, expect, it } from 'vitest';
import { docsManifest } from './test/content';
import {
  createSiteMetadata,
  getSiteMetadataRoutes,
  SITE_URL,
} from './site-metadata';
import { pageMetadata, resolveSitePage } from './server/pages';

describe('Next App Router metadata', () => {
  it('uses next-meta to generate canonical and social metadata without private URL values', () => {
    const metadata = pageMetadata(
      '/docs/getting-started?private=value#install',
      docsManifest,
    );
    expect(metadata.title).toBe('Getting Started - Chakra Email');
    expect(metadata.alternates?.canonical).toBe(
      `${SITE_URL}/docs/getting-started`,
    );
    expect(metadata.openGraph).toMatchObject({
      title: metadata.title,
      type: 'article',
      url: `${SITE_URL}/docs/getting-started`,
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary',
      creator: '@ryanhefner',
    });
    expect(JSON.stringify(metadata)).not.toContain('private=value');
  });
  it('resolves the docs alias to the real canonical page', () => {
    expect(pageMetadata('/docs', docsManifest).alternates?.canonical).toBe(
      `${SITE_URL}/docs/getting-started`,
    );
    expect(createSiteMetadata('/docs', docsManifest, '/email/').canonical).toBe(
      `${SITE_URL}/email/docs/getting-started`,
    );
    expect(pageMetadata('/', docsManifest).title).toBe(
      'Chakra Email - React email primitives with Chakra-style props',
    );
  });
  it.each([
    '/og-image',
    '/social-image',
    '/docs/social-image',
    '/og-image/docs',
    '/docs/getting-started/social-image',
    '/og-image/docs/getting-started',
  ])('marks %s noindex without normal social metadata', (route) => {
    expect(pageMetadata(route, docsManifest)).toMatchObject({
      title: 'Open Graph image - Chakra Email',
      robots: { index: false, follow: false },
      openGraph: null,
      twitter: null,
    });
  });
  it('does not index missing content or invent canonical pages', () => {
    for (const route of ['/missing', '/missing/social-image', '/404']) {
      expect(resolveSitePage(route, docsManifest)).toBeUndefined();
      const metadata = pageMetadata(route, docsManifest);
      expect(metadata.title).toBe('Page not found - Chakra Email');
      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata.alternates?.canonical).toBeUndefined();
    }
  });
  it('registers every public page and capture variant once', () => {
    const routes = getSiteMetadataRoutes(docsManifest);
    expect(new Set(routes).size).toBe(routes.length);
    for (const { url } of docsManifest.sitemap) {
      expect(routes).toContain(url);
      expect(routes).toContain(`${url}/social-image`);
      expect(routes).toContain(`/og-image${url}`);
    }
  });
  it.each([
    '//attacker.example/path',
    '/\\attacker.example/path',
    'https://attacker.example/path',
  ])('rejects non-local paths: %s', (route) => {
    expect(() => createSiteMetadata(route, docsManifest)).toThrow(
      'local site routes',
    );
  });
});

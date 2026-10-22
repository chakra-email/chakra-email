import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { docsManifest } from './docs';
import {
  applySiteMetadata,
  createSiteMetadata,
  getSiteMetadataRoutes,
  renderSiteMetadataHtml,
  SITE_URL,
} from './site-metadata';

const template =
  '<!doctype html><html><head><!-- site-metadata:start --><!-- site-metadata:end --><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/fonts.css"></head><body><div id="app"></div><script type="module" src="/assets/app.js"></script></body></html>';
const render = (route: string, base = '/') =>
  new JSDOM(
    renderSiteMetadataHtml(
      template,
      createSiteMetadata(route, docsManifest, base),
    ),
  ).window.document;

describe('framework-free next-meta integration', () => {
  it('emits unique canonical and social tags in HTML before JavaScript runs', () => {
    const doc = render('/docs/getting-started?private=value#install');
    expect(doc.title).toBe('Getting Started - Chakra Email');
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe(`${SITE_URL}/docs/getting-started`);
    expect(
      doc.querySelector('meta[property="og:url"]')?.getAttribute('content'),
    ).toBe(`${SITE_URL}/docs/getting-started`);
    expect(
      doc.querySelector('meta[property="og:type"]')?.getAttribute('content'),
    ).toBe('article');
    expect(
      doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
    ).toBe(doc.title);
    expect(doc.querySelector('meta[name="robots"]')).toBeNull();
    expect(doc.querySelector('meta[property="og:image"]')).toBeNull();
    expect(
      doc.querySelector('script[type="module"]')?.getAttribute('src'),
    ).toBe('/assets/app.js');
  });

  it('resolves the docs alias and deployment base to the real canonical page', () => {
    const doc = render('/docs', '/email/');
    expect(
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe(`${SITE_URL}/email/docs/getting-started`);
    expect(render('/').title).toBe(
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
  ])('marks %s noindex without leaking normal social cards', (route) => {
    const doc = render(route);
    expect(doc.title).toBe('Open Graph image - Chakra Email');
    expect(
      doc.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('noindex, nofollow');
    expect(doc.querySelector('meta[property="og:title"]')).toBeNull();
    expect(doc.querySelector('meta[name="twitter:card"]')).toBeNull();
  });

  it('does not index unknown pages or invent canonical routes', () => {
    for (const route of ['/missing', '/missing/social-image', '/404']) {
      const doc = render(route);
      expect(doc.title).toBe('Page not found - Chakra Email');
      expect(
        doc.querySelector('meta[name="robots"]')?.getAttribute('content'),
      ).toBe('noindex, nofollow');
      expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    }
  });

  it('escapes metadata values and retains unrelated head content across navigation', () => {
    const metadata = createSiteMetadata('/docs/getting-started', docsManifest);
    metadata.title = '<script>bad()</script> & "Title"';
    metadata.tags.push({ name: 'custom', content: '"><script>bad()</script>' });
    const doc = new JSDOM(renderSiteMetadataHtml(template, metadata)).window
      .document;
    expect(doc.title).toBe(metadata.title);
    expect(doc.head.querySelector('script')).toBeNull();
    expect(
      doc.querySelector('meta[name="custom"]')?.getAttribute('content'),
    ).toBe('"><script>bad()</script>');
    const cleanup = applySiteMetadata(
      doc,
      createSiteMetadata('/packages', docsManifest),
    );
    expect(doc.title).toBe('Packages - Chakra Email');
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(doc.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(doc.querySelector('meta[name="custom"]')).toBeNull();
    expect(doc.querySelector('link[rel="stylesheet"]')).not.toBeNull();
    expect(doc.querySelector('meta[name="viewport"]')).not.toBeNull();
    cleanup();
    expect(doc.querySelector('[data-site-metadata]')).toBeNull();
  });

  it('registers every public page and capture variant without duplicates', () => {
    const routes = getSiteMetadataRoutes(docsManifest);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toContain('/docs/social-image');
    expect(routes).toContain('/og-image/docs');
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
  ])('rejects non-local metadata paths: %s', (route) => {
    expect(() => createSiteMetadata(route, docsManifest)).toThrow(
      'local site routes',
    );
  });

  it('requires the explicit head marker instead of silently producing duplicate metadata', () => {
    expect(() =>
      renderSiteMetadataHtml(
        '<html></html>',
        createSiteMetadata('/', docsManifest),
      ),
    ).toThrow('marker is missing');
  });
});

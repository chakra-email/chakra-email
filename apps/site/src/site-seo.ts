import type { DocsManifest } from '@chakra-docs/core';
import { toSiteHref } from './routing';
import { SITE_URL } from './site-metadata';

function canonicalUrl(route: string, basePath: string) {
  const url = new URL(toSiteHref(route, basePath), SITE_URL);
  if (!route.startsWith('/') || url.origin !== SITE_URL) {
    throw new Error('Sitemap entries must be local site routes.');
  }
  url.search = '';
  url.hash = '';
  return url.href;
}

function escapeXml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

export function createSiteSitemap(manifest: DocsManifest, basePath = '/') {
  // Manifest sitemap entries exclude draft and hidden documentation. The /docs
  // alias renders Getting Started, so only its specific route is listed.
  const routes = [
    '/',
    '/examples',
    '/packages',
    '/withoss',
    ...manifest.sitemap.map(({ url }) => url),
  ];
  const urls = [
    ...new Set(routes.map((route) => canonicalUrl(route, basePath))),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

export function createSiteRobots(basePath = '/') {
  return [
    'User-agent: *',
    `Allow: ${toSiteHref('/', basePath)}`,
    `Disallow: ${toSiteHref('/og-image', basePath)}`,
    `Disallow: ${toSiteHref('/social-image', basePath)}`,
    `Disallow: ${toSiteHref('/*/social-image', basePath)}`,
    // Keep renderer-generated PNGs crawlable, not the HTML capture templates.
    `Allow: ${toSiteHref('/social-image.png', basePath)}`,
    `Allow: ${toSiteHref('/*/social-image.png', basePath)}`,
    '',
    `Sitemap: ${canonicalUrl('/sitemap.xml', basePath)}`,
    '',
  ].join('\n');
}

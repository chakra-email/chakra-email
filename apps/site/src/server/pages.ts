import type { DocsManifest } from '@chakra-docs/core';
import { getSocialImagePageRoute } from '../routing';
import { createSiteMetadata, sitePages } from '../site-metadata';
import { defineMeta, toMetadata } from 'next-meta/app';

export function resolveSitePage(pathname: string, manifest: DocsManifest) {
  const path =
    new URL(pathname, 'https://chakra.email').pathname.replace(/\/+$/, '') ||
    '/';
  const route = getSocialImagePageRoute(path) ?? path;
  return (
    Object.values(sitePages).find((page) => page.route === route) ??
    manifest.byRoute[route === '/docs' ? '/docs/getting-started' : route]
  );
}

export function pageMetadata(pathname: string, manifest: DocsManifest) {
  const metadata = createSiteMetadata(pathname, manifest);
  const description = metadata.tags.find(
    (tag) => tag.name === 'description',
  )?.content;
  const hidden = metadata.tags.some((tag) => tag.name === 'robots');
  const resolved = toMetadata(
    defineMeta({
      title: metadata.title,
      description,
      canonical: metadata.canonical,
      url: metadata.canonical,
      type:
        resolveSitePage(pathname, manifest)?.collectionId === 'docs'
          ? 'article'
          : 'website',
      twitter: { card: 'summary', creator: '@ryanhefner' },
    }),
  );
  return {
    ...resolved,
    openGraph: { ...resolved.openGraph, siteName: 'Chakra Email' },
    ...(hidden
      ? {
          robots: { index: false, follow: false },
          openGraph: null,
          twitter: null,
        }
      : {}),
  };
}

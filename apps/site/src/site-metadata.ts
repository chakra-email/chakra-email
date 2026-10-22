import type { DocsManifest, DocsPage } from '@chakra-docs/core';
import { defineMeta, resolveMeta } from 'next-meta/core';
import { getSocialImagePageRoute, toSiteHref } from './routing';

export const SITE_URL = 'https://chakra.email';
const SITE_DESCRIPTION = 'Documentation and examples for Chakra Email.';

export const sitePages: Record<
  'welcome' | 'examples' | 'packages' | 'withoss',
  DocsPage
> = {
  welcome: {
    id: 'welcome',
    title: 'Chakra Email',
    description:
      'Theme-aware React components and email-safe rendering. Your brand, your content, your delivery provider.',
    route: '/',
    slug: [],
    path: '',
    frontmatter: {},
    headings: [
      {
        id: 'explore-the-documentation',
        title: 'Explore the documentation',
        level: 2,
      },
      { id: 'more-resources', title: 'More resources', level: 2 },
    ],
  },
  examples: {
    id: 'examples',
    title: 'Template examples',
    description: 'Runnable reference templates and their source code.',
    route: '/examples',
    slug: ['examples'],
    path: '',
    frontmatter: {},
    headings: [{ id: 'template-source', title: 'Template source', level: 2 }],
  },
  packages: {
    id: 'packages',
    title: 'Packages',
    description: 'Choose the entrypoint that fits your application.',
    route: '/packages',
    slug: ['packages'],
    path: '',
    frontmatter: {},
  },
  withoss: {
    id: 'withoss',
    title: 'Made with OSS',
    description: 'The open-source software behind Chakra Email.',
    route: '/withoss',
    slug: ['withoss'],
    path: '',
    frontmatter: {},
  },
};

type HeadTag = { name?: string; property?: string; content: string };
export type SiteMetadata = {
  title: string;
  canonical?: string;
  tags: HeadTag[];
};

/** Shared by Vite's HTML build and client navigation; no Next or React runtime. */
export function createSiteMetadata(
  pathname: string,
  manifest: DocsManifest,
  basePath = '/',
): SiteMetadata {
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('\\')
  ) {
    throw new Error('Metadata paths must be local site routes.');
  }
  const path = new URL(pathname, SITE_URL).pathname.replace(/\/+$/, '') || '/';
  const captureRoute = getSocialImagePageRoute(path);
  const route = captureRoute ?? path;
  const page: DocsPage | undefined =
    Object.values(sitePages).find((item) => item.route === route) ??
    manifest.byRoute[route === '/docs' ? '/docs/getting-started' : route];
  const capture = captureRoute !== undefined && page !== undefined;
  const title = capture
    ? 'Open Graph image - Chakra Email'
    : path === '/'
      ? 'Chakra Email - React email primitives with Chakra-style props'
      : `${page?.title ?? 'Page not found'} - Chakra Email`;
  const meta = resolveMeta(
    defineMeta({
      baseUrl: SITE_URL,
      title,
      description: page?.description ?? SITE_DESCRIPTION,
      canonical: page
        ? toSiteHref(capture ? path : page.route, basePath)
        : undefined,
      url: page ? toSiteHref(capture ? path : page.route, basePath) : undefined,
      type: page?.collectionId === 'docs' ? 'article' : 'website',
      twitter: { card: 'summary', creator: '@ryanhefner' },
    }),
  );
  const tags: HeadTag[] = [
    { name: 'description', content: meta.description ?? SITE_DESCRIPTION },
  ];
  if (capture || !page)
    tags.push({ name: 'robots', content: 'noindex, nofollow' });
  if (!capture && page) {
    tags.push(
      { property: 'og:site_name', content: 'Chakra Email' },
      { property: 'og:type', content: meta.type ?? 'website' },
      { property: 'og:title', content: meta.title ?? title },
      {
        property: 'og:description',
        content: meta.description ?? SITE_DESCRIPTION,
      },
      { property: 'og:url', content: meta.url ?? '' },
      { name: 'twitter:card', content: meta.twitter?.card ?? 'summary' },
      {
        name: 'twitter:creator',
        content: meta.twitter?.creator ?? '@ryanhefner',
      },
      { name: 'twitter:title', content: meta.twitter?.title ?? title },
      {
        name: 'twitter:description',
        content: meta.twitter?.description ?? SITE_DESCRIPTION,
      },
    );
  }
  return {
    title: meta.documentTitle ?? title,
    canonical: meta.canonical,
    tags,
  };
}

export function getSiteMetadataRoutes(manifest: DocsManifest): string[] {
  const publicRoutes = [
    ...Object.values(sitePages).map((page) => page.route),
    ...manifest.sitemap.map(({ url }) => url),
  ];
  const captureRoutes = [...publicRoutes, '/docs'];
  return [
    ...new Set([
      ...publicRoutes,
      '/docs',
      '/404',
      '/og-image',
      ...captureRoutes.map(
        (route) => `${route === '/' ? '' : route}/social-image`,
      ),
      ...captureRoutes
        .filter((route) => route !== '/')
        .map((route) => `/og-image${route}`),
    ]),
  ];
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );

export function renderSiteMetadataHtml(
  html: string,
  metadata: SiteMetadata,
  structuredDataHtml = '',
): string {
  const marker =
    /<!-- site-metadata:start -->[\s\S]*?<!-- site-metadata:end -->/;
  if (!marker.test(html))
    throw new Error('Site metadata HTML marker is missing.');
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    ...(metadata.canonical
      ? [
          `<link rel="canonical" data-site-metadata href="${escapeHtml(metadata.canonical)}">`,
        ]
      : []),
    ...metadata.tags.map(
      (tag) =>
        `<meta data-site-metadata ${tag.name ? `name="${escapeHtml(tag.name)}"` : `property="${escapeHtml(tag.property ?? '')}"`} content="${escapeHtml(tag.content)}">`,
    ),
  ];
  return html.replace(
    marker,
    () =>
      `<!-- site-metadata:start -->\n${tags.join('\n')}\n${structuredDataHtml}\n<!-- site-metadata:end -->`,
  );
}

export function applySiteMetadata(
  document: Document,
  metadata: SiteMetadata,
): () => void {
  document.title = metadata.title;
  document.head
    .querySelectorAll('[data-site-metadata]')
    .forEach((node) => node.remove());
  const owned: Element[] = [];
  if (metadata.canonical) {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = metadata.canonical;
    owned.push(link);
  }
  for (const tag of metadata.tags) {
    const element = document.createElement('meta');
    if (tag.name) element.name = tag.name;
    if (tag.property) element.setAttribute('property', tag.property);
    element.content = tag.content;
    owned.push(element);
  }
  for (const element of owned) {
    element.setAttribute('data-site-metadata', '');
    document.head.append(element);
  }
  return () => owned.forEach((element) => element.remove());
}

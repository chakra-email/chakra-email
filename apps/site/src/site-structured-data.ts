import type { DocsManifest } from '@chakra-docs/core';
import { ossProjectGroups } from './oss-projects';
import { createPageGraph } from './structured-data';
import { createSiteMetadata, sitePages, SITE_URL } from './site-metadata';
import { toSiteHref } from './routing';
import { exampleLinks, packageLinks } from './site-resources';

/** The build and SPA share route resolution, canonical URLs, and exclusions. */
export function createSiteStructuredData(
  pathname: string,
  manifest: DocsManifest,
  basePath = '/',
) {
  const metadata = createSiteMetadata(pathname, manifest, basePath);
  if (!metadata.canonical || metadata.tags.some((tag) => tag.name === 'robots'))
    return undefined;
  const route = new URL(pathname, SITE_URL).pathname.replace(/\/+$/, '') || '/';
  const page =
    Object.values(sitePages).find((page) => page.route === route) ??
    manifest.byRoute[route === '/docs' ? '/docs/getting-started' : route];
  if (!page) return undefined;
  const documentation = !!manifest.byRoute[page.route];
  const items =
    route === '/withoss'
      ? ossProjectGroups.flatMap((group) =>
          group.projects.map((project) => ({
            name: project.name,
            url: project.href,
            description: project.description,
          })),
        )
      : route === '/examples'
        ? exampleLinks.map((example) => ({
            name: example.title,
            url: example.href,
            description: example.description,
          }))
        : route === '/packages'
          ? packageLinks.map((item) => ({
              name: item.name,
              url: item.href,
              description: item.description,
            }))
          : undefined;
  return createPageGraph(
    { ...page, route: new URL(metadata.canonical).pathname },
    {
      homePath: toSiteHref('/', basePath),
      documentation,
      collection: route === '/packages' || route === '/examples',
      items,
      breadcrumbs: [
        { name: 'Home', path: toSiteHref('/', basePath) },
        ...(documentation && page.route !== '/docs/getting-started'
          ? [
              {
                name: 'Documentation',
                path: toSiteHref('/docs/getting-started', basePath),
              },
            ]
          : []),
        ...(page.route !== '/'
          ? [{ name: page.title, path: toSiteHref(page.route, basePath) }]
          : []),
      ],
    },
  );
}

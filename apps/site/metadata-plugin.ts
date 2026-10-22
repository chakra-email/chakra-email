import type { Plugin } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Graph } from 'react-structured';
import { createSiteStructuredData } from './src/site-structured-data';
import { loadSiteDocsManifest } from './discovery-plugin';
import { getSitePathname } from './src/routing';
import {
  createSiteMetadata,
  getSiteMetadataRoutes,
  renderSiteMetadataHtml,
} from './src/site-metadata';

function structuredDataHtml(
  route: string,
  manifest: Awaited<ReturnType<typeof loadSiteDocsManifest>>,
  basePath: string,
) {
  const data = createSiteStructuredData(route, manifest, basePath);
  if (!data) return '';
  // The SPA removes this build-owned script before rendering its current graph.
  return renderToStaticMarkup(
    createElement(Graph, { id: 'page-structured-data', data }),
  ).replace('<script ', '<script data-site-metadata ');
}

/** Emit page-specific HTML heads while leaving the application client-rendered. */
export function siteMetadataPlugin(): Plugin {
  let basePath = '/';
  return {
    name: 'site-next-meta',
    enforce: 'post',
    configResolved(config) {
      basePath = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      async handler(html, context) {
        const requested = new URL(
          context.originalUrl ?? context.path,
          'https://metadata.invalid',
        ).pathname;
        const pathname = getSitePathname(requested, basePath);
        const route = pathname === '/index.html' ? '/' : pathname;
        const manifest = await loadSiteDocsManifest();
        return renderSiteMetadataHtml(
          html,
          createSiteMetadata(route, manifest, basePath),
          structuredDataHtml(route, manifest, basePath),
        );
      },
    },
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        const index = bundle['index.html'];
        if (!index || index.type !== 'asset')
          throw new Error('Site HTML build output is missing.');
        const template =
          typeof index.source === 'string'
            ? index.source
            : new TextDecoder().decode(index.source);
        const manifest = await loadSiteDocsManifest();
        for (const route of getSiteMetadataRoutes(manifest)) {
          const source = renderSiteMetadataHtml(
            template,
            createSiteMetadata(route, manifest, basePath),
            structuredDataHtml(route, manifest, basePath),
          );
          if (route === '/') index.source = source;
          else
            this.emitFile({
              type: 'asset',
              fileName:
                route === '/404' ? '404.html' : `${route.slice(1)}/index.html`,
              source,
            });
        }
      },
    },
  };
}

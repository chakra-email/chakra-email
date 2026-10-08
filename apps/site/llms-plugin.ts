import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { createSiteDocPages, docPageDefinitions } from './src/doc-pages';
import { createSiteDocsManifest } from './src/docs-manifest';
import { createSiteLlmsText } from './src/llms';
import { getSitePathname } from './src/routing';

export async function createLlmsFiles(basePath = '/') {
  const sources = Object.fromEntries(
    await Promise.all(
      docPageDefinitions.map(async ({ sourceFile }) => [
        sourceFile,
        await readFile(
          new URL(`../../docs/${sourceFile}`, import.meta.url),
          'utf8',
        ),
      ]),
    ),
  );
  const manifest = createSiteDocsManifest(createSiteDocPages(sources));
  return {
    'llms.txt': createSiteLlmsText(manifest, basePath),
    'llms-full.txt': createSiteLlmsText(manifest, basePath, true),
  };
}

export function llmsFilesPlugin(): Plugin {
  let basePath = '/';
  return {
    name: 'llms-files',
    configResolved(config) {
      basePath = config.base;
    },
    configureServer(server) {
      server.watcher.add(
        docPageDefinitions.map(({ sourceFile }) =>
          fileURLToPath(new URL(`../../docs/${sourceFile}`, import.meta.url)),
        ),
      );
      server.middlewares.use(async (request, response, next) => {
        const pathname = getSitePathname(
          new URL(request.url ?? '/', 'http://llms.invalid').pathname,
          basePath,
        );
        if (pathname !== '/llms.txt' && pathname !== '/llms-full.txt') {
          next();
          return;
        }
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.statusCode = 405;
          response.setHeader('Allow', 'GET, HEAD');
          response.end('Method not allowed');
          return;
        }
        try {
          const files = await createLlmsFiles(basePath);
          response.end(
            request.method === 'HEAD'
              ? undefined
              : files[pathname.slice(1) as keyof typeof files],
          );
        } catch (error) {
          next(error);
        }
      });
    },
    async generateBundle() {
      for (const [fileName, source] of Object.entries(
        await createLlmsFiles(basePath),
      )) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}

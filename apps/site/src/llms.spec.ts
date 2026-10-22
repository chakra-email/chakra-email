import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, ResolvedConfig, ViteDevServer } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import {
  createDiscoveryFiles,
  discoveryFilesPlugin,
} from '../discovery-plugin';
import { createSiteDocPages } from './doc-pages';
import { docsManifest } from './docs';
import { createSiteLlmsText } from './llms';

describe('LLM documentation files', () => {
  it('uses the browser manifest and complete sources for build and development', async () => {
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

  it('keeps documentation and full-file links under the deployment base', async () => {
    const files = await createDiscoveryFiles('/email/');
    expect(files['llms.txt']).toContain(
      'https://chakra.email/email/llms-full.txt',
    );
    expect(files['llms.txt']).toContain(
      '](https://chakra.email/email/docs/getting-started)',
    );
    expect(files['llms-full.txt']).toContain(
      'Source: https://chakra.email/email/docs/getting-started',
    );
  });

  it('excludes draft and hidden content from both files', () => {
    const privatePages = ['draft', 'hidden'].map((flag) => ({
      ...docsManifest.pages[0],
      id: flag,
      route: `/docs/${flag}`,
      frontmatter: { [flag]: true },
      body: `private-${flag}-body`,
    }));
    for (const full of [false, true]) {
      expect(
        createSiteLlmsText(
          { ...docsManifest, pages: [...docsManifest.pages, ...privatePages] },
          '/',
          full,
        ),
      ).not.toMatch(/private-(draft|hidden)-body|\/docs\/(draft|hidden)/);
    }
  });

  it('fails the build instead of silently omitting a missing documentation source', () => {
    expect(() => createSiteDocPages({})).toThrow(
      'Missing documentation source',
    );
  });

  it.each(['llms.txt', 'llms-full.txt', 'sitemap.xml', 'robots.txt'] as const)(
    'serves %s for GET/HEAD under the dev base, rejects writes, and passes other routes through',
    async (route) => {
      const plugin = discoveryFilesPlugin();
      if (
        typeof plugin.configResolved !== 'function' ||
        typeof plugin.configureServer !== 'function'
      ) {
        throw new Error('Expected development hooks');
      }
      let middleware: Connect.NextHandleFunction | undefined;
      plugin.configResolved({ base: '/email/' } as ResolvedConfig);
      plugin.configureServer({
        watcher: { add: vi.fn() },
        middlewares: {
          use: (handler: Connect.NextHandleFunction) => {
            middleware = handler;
          },
        },
      } as unknown as ViteDevServer);
      if (!middleware) throw new Error('Expected LLM middleware');
      const files = await createDiscoveryFiles('/email/');
      for (const method of ['GET', 'HEAD', 'POST']) {
        const response = { setHeader: vi.fn(), end: vi.fn(), statusCode: 200 };
        const next = vi.fn();
        await middleware(
          { url: `/email/${route}?v=1`, method } as IncomingMessage,
          response as unknown as ServerResponse,
          next,
        );
        expect(next).not.toHaveBeenCalled();
        expect(response.setHeader).toHaveBeenCalledWith(
          'Content-Type',
          route === 'sitemap.xml'
            ? 'application/xml; charset=utf-8'
            : 'text/plain; charset=utf-8',
        );
        expect(response.statusCode).toBe(method === 'POST' ? 405 : 200);
        expect(response.end).toHaveBeenCalledWith(
          method === 'GET'
            ? files[route]
            : method === 'HEAD'
              ? undefined
              : 'Method not allowed',
        );
        if (method === 'POST')
          expect(response.setHeader).toHaveBeenCalledWith('Allow', 'GET, HEAD');
      }
      const next = vi.fn();
      const response = { setHeader: vi.fn(), end: vi.fn() };
      await middleware(
        { url: '/email/docs/components', method: 'GET' } as IncomingMessage,
        response as unknown as ServerResponse,
        next,
      );
      expect(next).toHaveBeenCalledOnce();
      expect(response.end).not.toHaveBeenCalled();
    },
  );
});

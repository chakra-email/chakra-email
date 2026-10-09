/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { discoveryFilesPlugin } from './discovery-plugin';
import { getSitePathname, getSocialImagePageRoute } from './src/routing';
import type { IncomingMessage, ServerResponse } from 'node:http';

function captureHeaders(
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) {
  const url = new URL(request.url ?? '/', 'http://capture.invalid');
  const pathname = getSitePathname(
    url.pathname,
    process.env['SITE_BASE_PATH'] ?? '/',
  );
  // Vite's HTML fallback must not make renderer-owned PNG URLs look valid.
  if (
    pathname.endsWith('.png') &&
    getSocialImagePageRoute(pathname.slice(0, -4)) !== undefined
  ) {
    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Image generation is handled by the configured renderer.');
    return;
  }
  if (getSocialImagePageRoute(pathname) !== undefined) {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
}

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/site',
  base: process.env['SITE_BASE_PATH'] ?? '/',
  server: {
    port: 4200,
    host: 'localhost',
    allowedHosts: ['chakra-email.test'],
  },
  preview: {
    port: 4300,
    host: 'localhost',
    allowedHosts: ['chakra-email.test'],
  },
  plugins: [
    discoveryFilesPlugin(),
    {
      name: 'social-image-capture-headers',
      configureServer(server) {
        server.middlewares.use(captureHeaders);
      },
      configurePreviewServer(server) {
        server.middlewares.use(captureHeaders);
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom', '@chakra-ui/react', '@emotion/react'],
  },
  test: {
    name: 'site',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 85,
        statements: 85,
      },
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));

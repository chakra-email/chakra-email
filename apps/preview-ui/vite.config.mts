/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/preview-ui',
  base: '/__preview/',
  publicDir: false as const,
  server: {
    port: 4210,
    host: 'localhost',
  },
  preview: {
    port: 4310,
    host: 'localhost',
  },
  plugins: [],
  build: {
    outDir: '../../packages/preview/dist/ui',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'preview-ui',
    watch: false,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test.setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      reporter: ['text', 'lcov'],
      include: ['src/app.ts', 'src/workspace.tsx'],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
}));

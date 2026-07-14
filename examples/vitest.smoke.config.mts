import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/examples-smoke',
  test: {
    name: 'examples-smoke',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['smoke.spec.tsx'],
    reporters: ['default'],
  },
});

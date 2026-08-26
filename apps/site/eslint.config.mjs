import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    // Yalc packages are external dependencies even though their linked copies
    // live beneath this app while the libraries are under active development.
    files: ['src/app.tsx', 'src/content.ts', 'src/docs.ts'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];

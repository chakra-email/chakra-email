import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:chakra-email-core',
              onlyDependOnLibsWithTags: ['scope:chakra-email-core'],
            },
            {
              sourceTag: 'scope:chakra-email',
              onlyDependOnLibsWithTags: [
                'scope:chakra-email-core',
                'scope:chakra-email',
              ],
            },
            {
              sourceTag: 'scope:chakra-email-v2',
              onlyDependOnLibsWithTags: [
                'scope:chakra-email-core',
                'scope:chakra-email-v2',
              ],
            },
            {
              sourceTag: 'scope:chakra-email-code-block',
              onlyDependOnLibsWithTags: [
                'scope:chakra-email-core',
                'scope:chakra-email-code-block',
              ],
            },
            {
              sourceTag: 'scope:chakra-email-markdown',
              onlyDependOnLibsWithTags: [
                'scope:chakra-email-core',
                'scope:chakra-email-code-block',
                'scope:chakra-email-markdown',
              ],
            },
            {
              sourceTag: 'scope:chakra-email-preview',
              onlyDependOnLibsWithTags: [
                'scope:chakra-email-core',
                'scope:chakra-email-preview',
              ],
            },
            {
              sourceTag: 'scope:chakra-email-react-email',
              onlyDependOnLibsWithTags: [
                'scope:chakra-email-core',
                'scope:chakra-email-react-email',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];

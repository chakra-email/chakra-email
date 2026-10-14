/** Selected credits, not an exhaustive transitive dependency or license inventory. */
export const ossProjectGroups = [
  {
    id: 'library',
    title: 'Library and packages',
    description:
      'Selected dependencies and framework peers used by the published library and its optional packages. Optional integrations are labeled below.',
    projects: [
      {
        name: 'React',
        packages: ['react'],
        description: 'Components and rendering for the library APIs.',
        href: 'https://react.dev/',
      },
      {
        name: 'html-to-text',
        packages: ['html-to-text'],
        description: 'Plaintext emails generated from the rendered HTML.',
        href: 'https://github.com/html-to-text/node-html-to-text',
      },
      {
        name: 'react-markdown',
        packages: ['react-markdown'],
        description: 'Safe Markdown rendering without executable MDX.',
        href: 'https://github.com/remarkjs/react-markdown',
      },
      {
        name: 'remark / unified',
        packages: ['remark-gfm'],
        description:
          'GitHub-flavored Markdown parsing and document processing.',
        href: 'https://unifiedjs.com/',
      },
      {
        name: 'remark-directive',
        packages: ['remark-directive'],
        description: 'Non-executable declarative Markdown components.',
        href: 'https://github.com/remarkjs/remark-directive',
      },
      {
        name: 'React Email',
        packages: ['react-email'],
        description:
          'Optional renderer integration through @chakra-email/react-email.',
        href: 'https://react.email/',
      },
      {
        name: 'parse5',
        packages: ['parse5'],
        description:
          'HTML parsing for preview sanitization and compatibility linting.',
        href: 'https://parse5.js.org/',
      },
      {
        name: 'jiti',
        packages: ['jiti'],
        description: 'Loading TypeScript templates in the preview workspace.',
        href: 'https://github.com/unjs/jiti',
      },
      {
        name: 'tinyglobby',
        packages: ['tinyglobby'],
        description: 'Discovering email templates for preview and export.',
        href: 'https://github.com/SuperchupuDev/tinyglobby',
      },
      {
        name: 'Vite',
        packages: ['vite'],
        description: 'Template compilation in the published preview package.',
        href: 'https://vite.dev/',
      },
    ],
  },
  {
    id: 'site',
    title: 'Documentation site',
    description:
      'Projects used to build and run this website. Shared dependencies appear in both sections when they serve both.',
    projects: [
      {
        name: 'next-meta',
        packages: ['next-meta'],
        description:
          'Framework-free canonical and social metadata for the site.',
        href: 'https://next-meta.dev/',
      },
      {
        name: 'React',
        packages: ['react', 'react-dom'],
        description: 'The component and rendering foundation for this site.',
        href: 'https://react.dev/',
      },
      {
        name: 'Chakra UI',
        packages: ['@chakra-ui/react'],
        description:
          "Accessible interface components and the site's theme system.",
        href: 'https://chakra-ui.com/',
      },
      {
        name: 'Chakra Docs',
        packages: ['@chakra-docs/chakra', '@chakra-docs/core'],
        description:
          'Documentation navigation, search, page actions, and code examples.',
        href: 'https://github.com/chakra-docs/chakra-docs',
      },
      {
        name: 'Postkit',
        packages: ['@postkit/react'],
        description: 'Markdown prose and document components for the guides.',
        href: 'https://github.com/postkit-org/postkit-js',
      },
      {
        name: 'next-themes',
        packages: ['next-themes'],
        description: 'System-aware light and dark color modes.',
        href: 'https://github.com/pacocoursey/next-themes',
      },
      {
        name: 'react-fathom',
        packages: ['react-fathom', 'fathom-client'],
        description:
          'Privacy-focused pageviews and documentation interaction events.',
        href: 'https://react-fathom.dev/',
      },
      {
        name: 'React Icons',
        packages: ['react-icons'],
        description: 'Consistent SVG icons across the interface.',
        href: 'https://react-icons.github.io/react-icons/',
      },
      {
        name: 'Shiki',
        packages: ['shiki'],
        description: 'Syntax highlighting for documentation examples.',
        href: 'https://shiki.style/',
      },
      {
        name: 'Vite',
        packages: ['vite'],
        description: 'Development server and production builds for this site.',
        href: 'https://vite.dev/',
      },
      {
        name: 'Nx',
        packages: ['nx'],
        description:
          'Development tooling for workspace builds and verification.',
        href: 'https://nx.dev/',
      },
    ],
  },
] as const;

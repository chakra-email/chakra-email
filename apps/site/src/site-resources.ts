import type { Example, PackageLink } from './content';

const repo = 'https://github.com/chakra-email/chakra-email';

export const exampleLinks: Omit<Example, 'source'>[] = [
  {
    id: 'basic',
    title: 'Basic Welcome Email',
    description: 'A minimal branded welcome email with preview text and a CTA.',
    href: `${repo}/tree/main/examples/basic`,
  },
  {
    id: 'markdown-body',
    title: 'Markdown Body Email',
    description: 'A template that wraps a markdown-rendered email body.',
    href: `${repo}/tree/main/examples/markdown-body`,
  },
  {
    id: 'chakra-v2',
    title: 'Chakra v2 Theme Email',
    description: 'Compatibility example for Chakra UI v2-style theme tokens.',
    href: `${repo}/tree/main/examples/chakra-v2`,
  },
  {
    id: 'preview',
    title: 'Preview Template And Variants',
    description:
      'A complete template with typed preview props and named development variants.',
    href: `${repo}/tree/main/examples/preview`,
  },
];

export const packageLinks: PackageLink[] = [
  {
    name: 'chakra-email',
    description: 'Recommended public entrypoint for new projects.',
    install: 'npm install chakra-email',
    href: 'https://www.npmjs.com/package/chakra-email',
  },
  {
    name: '@chakra-email/core',
    description: 'Core renderer, provider, theme utilities, and components.',
    install: 'npm install @chakra-email/core',
    href: 'https://www.npmjs.com/package/@chakra-email/core',
  },
  {
    name: '@chakra-email/chakra-v2',
    description: 'Compatibility helpers for Chakra UI v2 theme objects.',
    install: 'npm install @chakra-email/chakra-v2',
    href: 'https://www.npmjs.com/package/@chakra-email/chakra-v2',
  },
  {
    name: '@chakra-email/markdown',
    description: 'Safe GFM and declarative content for email bodies.',
    install: 'npm install @chakra-email/markdown',
    href: 'https://www.npmjs.com/package/@chakra-email/markdown',
  },
  {
    name: '@chakra-email/code-block',
    description: 'Email-safe syntax-highlighted code blocks.',
    install: 'npm install @chakra-email/code-block',
    href: 'https://www.npmjs.com/package/@chakra-email/code-block',
  },
  {
    name: '@chakra-email/react-email',
    description: 'Optional adapter for React Email rendering.',
    install: 'npm install @chakra-email/react-email',
    href: 'https://www.npmjs.com/package/@chakra-email/react-email',
  },
  {
    name: '@chakra-email/preview',
    description: 'Reusable local template preview CLI and browser application.',
    install: 'npm install --save-dev @chakra-email/preview',
    href: 'https://www.npmjs.com/package/@chakra-email/preview',
  },
];

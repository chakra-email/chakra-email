import chakraV2Docs from '../../../docs/chakra-v2.md?raw';
import componentsDocs from '../../../docs/components.md?raw';
import gettingStartedDocs from '../../../docs/getting-started.md?raw';
import markdownDocs from '../../../docs/markdown.md?raw';
import architectureDocs from '../../../docs/package-architecture.md?raw';
import previewDocs from '../../../docs/preview.md?raw';
import renderingDocs from '../../../docs/rendering.md?raw';
import siteDocs from '../../../docs/site.md?raw';
import themingDocs from '../../../docs/theming.md?raw';
import chakraV2Example from '../../../examples/chakra-v2/legacy-theme-email.tsx?raw';
import basicExample from '../../../examples/basic/welcome-email.tsx?raw';
import markdownExample from '../../../examples/markdown-body/markdown-email.tsx?raw';
import previewExample from '../../../examples/preview/emails/welcome.email.tsx?raw';

import { createSiteDocPages } from './doc-pages';

const repo = 'https://github.com/chakra-email/chakra-email';

export type { SiteDocPage } from './doc-pages';

export type Example = {
  id: string;
  title: string;
  description: string;
  href: string;
  source: string;
};

export type PackageLink = {
  name: string;
  description: string;
  install: string;
  href: string;
};

export const quickStartSteps = [
  {
    title: 'Install the package',
    command: 'npm install chakra-email react react-dom',
  },
  {
    title: 'Create a themed email',
    command: 'import { ChakraEmailProvider, Button } from "chakra-email"',
  },
  {
    title: 'Render provider-ready output',
    command: 'await render(<WelcomeEmail />, { pretty: true })',
  },
];

export const docPages = createSiteDocPages({
  'chakra-v2.md': chakraV2Docs,
  'components.md': componentsDocs,
  'getting-started.md': gettingStartedDocs,
  'markdown.md': markdownDocs,
  'package-architecture.md': architectureDocs,
  'preview.md': previewDocs,
  'rendering.md': renderingDocs,
  'site.md': siteDocs,
  'theming.md': themingDocs,
});

export const examples: Example[] = [
  {
    id: 'basic',
    title: 'Basic Welcome Email',
    description: 'A minimal branded welcome email with preview text and a CTA.',
    href: `${repo}/tree/main/examples/basic`,
    source: basicExample,
  },
  {
    id: 'markdown-body',
    title: 'Markdown Body Email',
    description: 'A template that wraps a markdown-rendered email body.',
    href: `${repo}/tree/main/examples/markdown-body`,
    source: markdownExample,
  },
  {
    id: 'chakra-v2',
    title: 'Chakra v2 Theme Email',
    description: 'Compatibility example for Chakra UI v2-style theme tokens.',
    href: `${repo}/tree/main/examples/chakra-v2`,
    source: chakraV2Example,
  },
  {
    id: 'preview',
    title: 'Preview Template And Variants',
    description:
      'A complete template with typed preview props and named development variants.',
    href: `${repo}/tree/main/examples/preview`,
    source: previewExample,
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

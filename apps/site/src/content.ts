import chakraV2Docs from '../../../docs/chakra-v2.md?raw';
import componentsDocs from '../../../docs/components.md?raw';
import gettingStartedDocs from '../../../docs/getting-started.md?raw';
import markdownDocs from '../../../docs/markdown.md?raw';
import architectureDocs from '../../../docs/package-architecture.md?raw';
import renderingDocs from '../../../docs/rendering.md?raw';
import siteDocs from '../../../docs/site.md?raw';
import themingDocs from '../../../docs/theming.md?raw';
import chakraV2Example from '../../../examples/chakra-v2/legacy-theme-email.tsx?raw';
import basicExample from '../../../examples/basic/welcome-email.tsx?raw';
import markdownExample from '../../../examples/markdown-body/markdown-email.tsx?raw';

const repo = 'https://github.com/ryanhefner/chakra-email';

export type DocPage = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  source: string;
  sourceHref: string;
};

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

export const docPages: DocPage[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    eyebrow: 'Start here',
    description: 'Install Chakra Email, compose a template, and render HTML.',
    source: gettingStartedDocs,
    sourceHref: `${repo}/blob/main/docs/getting-started.md`,
  },
  {
    id: 'components',
    title: 'Components',
    eyebrow: 'Primitive catalog',
    description:
      'Email-safe document, layout, text, CTA, and markdown components.',
    source: componentsDocs,
    sourceHref: `${repo}/blob/main/docs/components.md`,
  },
  {
    id: 'theming',
    title: 'Theming',
    eyebrow: 'Design tokens',
    description:
      'Resolve Chakra-style tokens into email-compatible inline styles.',
    source: themingDocs,
    sourceHref: `${repo}/blob/main/docs/theming.md`,
  },
  {
    id: 'markdown',
    title: 'Markdown',
    eyebrow: 'Markdown bodies',
    description:
      'Map markdown documents to reliable email-safe React children.',
    source: markdownDocs,
    sourceHref: `${repo}/blob/main/docs/markdown.md`,
  },
  {
    id: 'rendering',
    title: 'Rendering',
    eyebrow: 'HTML output',
    description: 'Render static HTML and plain text for delivery providers.',
    source: renderingDocs,
    sourceHref: `${repo}/blob/main/docs/rendering.md`,
  },
  {
    id: 'chakra-v2',
    title: 'Chakra v2',
    eyebrow: 'Legacy themes',
    description:
      'Use Chakra UI v2-style theme objects through the compatibility entrypoint.',
    source: chakraV2Docs,
    sourceHref: `${repo}/blob/main/docs/chakra-v2.md`,
  },
  {
    id: 'package-architecture',
    title: 'Package Architecture',
    eyebrow: 'Monorepo map',
    description:
      'Understand package boundaries and what belongs in each entrypoint.',
    source: architectureDocs,
    sourceHref: `${repo}/blob/main/docs/package-architecture.md`,
  },
  {
    id: 'documentation-site',
    title: 'Documentation Site',
    eyebrow: 'Site operations',
    description:
      'Build, preview, deploy, and extend the canonical documentation site.',
    source: siteDocs,
    sourceHref: `${repo}/blob/main/docs/site.md`,
  },
];

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
];

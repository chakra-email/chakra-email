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

import { exampleLinks } from './site-resources';

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

export const examples: Example[] = exampleLinks.map((example) => ({
  ...example,
  source:
    example.id === 'basic'
      ? basicExample
      : example.id === 'markdown-body'
        ? markdownExample
        : example.id === 'chakra-v2'
          ? chakraV2Example
          : previewExample,
}));

export { packageLinks } from './site-resources';

const repo = 'https://github.com/chakra-email/chakra-email';

export type SiteDocPage = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  source: string;
  sourceHref: string;
};

export const docPageDefinitions = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    eyebrow: 'Start here',
    description: 'Install Chakra Email, compose a template, and render HTML.',
    sourceFile: 'getting-started.md',
    sourceHref: `${repo}/blob/main/docs/getting-started.md`,
  },
  {
    id: 'components',
    title: 'Components',
    eyebrow: 'Primitive catalog',
    description:
      'Email-safe document, layout, text, CTA, and markdown components.',
    sourceFile: 'components.md',
    sourceHref: `${repo}/blob/main/docs/components.md`,
  },
  {
    id: 'theming',
    title: 'Theming',
    eyebrow: 'Design tokens',
    description:
      'Resolve Chakra-style tokens into email-compatible inline styles.',
    sourceFile: 'theming.md',
    sourceHref: `${repo}/blob/main/docs/theming.md`,
  },
  {
    id: 'markdown',
    title: 'Markdown',
    eyebrow: 'Markdown bodies',
    description:
      'Map markdown documents to reliable email-safe React children.',
    sourceFile: 'markdown.md',
    sourceHref: `${repo}/blob/main/docs/markdown.md`,
  },
  {
    id: 'rendering',
    title: 'Rendering',
    eyebrow: 'HTML output',
    description: 'Render static HTML and plain text for delivery providers.',
    sourceFile: 'rendering.md',
    sourceHref: `${repo}/blob/main/docs/rendering.md`,
  },
  {
    id: 'preview',
    title: 'Email Preview',
    eyebrow: 'Local workflow',
    description:
      'Discover, live-render, resize, and inspect templates in the local preview app.',
    sourceFile: 'preview.md',
    sourceHref: `${repo}/blob/main/docs/preview.md`,
  },
  {
    id: 'chakra-v2',
    title: 'Chakra v2',
    eyebrow: 'Legacy themes',
    description:
      'Use Chakra UI v2-style theme objects through the compatibility entrypoint.',
    sourceFile: 'chakra-v2.md',
    sourceHref: `${repo}/blob/main/docs/chakra-v2.md`,
  },
  {
    id: 'package-architecture',
    title: 'Package Architecture',
    eyebrow: 'Monorepo map',
    description:
      'Understand package boundaries and what belongs in each entrypoint.',
    sourceFile: 'package-architecture.md',
    sourceHref: `${repo}/blob/main/docs/package-architecture.md`,
  },
  {
    id: 'documentation-site',
    title: 'Documentation Site',
    eyebrow: 'Site operations',
    description:
      'Build, preview, deploy, and extend the canonical documentation site.',
    sourceFile: 'site.md',
    sourceHref: `${repo}/blob/main/docs/site.md`,
  },
] satisfies (Omit<SiteDocPage, 'source'> & { sourceFile: string })[];

export function createSiteDocPages(
  sources: Record<string, string>,
): SiteDocPage[] {
  return docPageDefinitions.map(({ sourceFile, ...page }) => {
    const source = sources[sourceFile];
    if (typeof source !== 'string') {
      throw new Error(`Missing documentation source: ${sourceFile}`);
    }
    return { ...page, source };
  });
}

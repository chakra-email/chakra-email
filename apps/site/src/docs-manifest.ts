import {
  createDocsManifest,
  getDocsMarkdownHeadings,
  type DocsHeading,
  type DocsManifest,
  type DocsPage,
} from '@chakra-docs/core';

import type { SiteDocPage } from './doc-pages';

const repositoryUrl = 'https://github.com/chakra-email/chakra-email';

export function prepareMarkdown(source: string): string {
  return source.replace(/^#\s+[^\n]+\r?\n+/, '').trim();
}

export function extractDocsHeadings(source: string): DocsHeading[] {
  return getDocsMarkdownHeadings(prepareMarkdown(source)).map(
    ({ id, title, level }) => ({ id, title, level }),
  );
}

export function createSiteDocsManifest(
  docPages: readonly SiteDocPage[],
): DocsManifest {
  const pages: DocsPage[] = docPages.map((page, index) => ({
    id: page.id,
    collectionId: 'docs',
    slug: [page.id],
    path: `docs/${page.id}.md`,
    route: `/docs/${page.id}`,
    title: page.title,
    description: page.description,
    frontmatter: {
      title: page.title,
      description: page.description,
      navTitle: page.title,
      order: index,
      eyebrow: page.eyebrow,
      sourceHref: page.sourceHref,
    },
    body: prepareMarkdown(page.source),
    headings: extractDocsHeadings(page.source),
  }));

  return createDocsManifest({
    repositories: [
      {
        id: 'chakra-email',
        type: 'git',
        url: `${repositoryUrl}.git`,
        ref: 'main',
      },
    ],
    collections: [
      {
        id: 'docs',
        name: 'Chakra Email',
        basePath: '/docs',
        pages,
        nav: pages.map((page) => ({
          id: page.id,
          title: page.title,
          href: page.route,
          slug: page.slug,
        })),
      },
    ],
    config: {
      title: 'Chakra Email',
    },
  });
}

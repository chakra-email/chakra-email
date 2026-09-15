import {
  createDocsManifest,
  createHeadingId,
  createHeadingIdGenerator,
  stripMarkdown,
  type DocsHeading,
  type DocsManifest,
  type DocsPage,
} from '@chakra-docs/core';

import { docPages } from './content';

const repositoryUrl = 'https://github.com/chakra-email/chakra-email';

export function prepareMarkdown(source: string): string {
  return source.replace(/^#\s+[^\n]+\r?\n+/, '').trim();
}

export function extractDocsHeadings(source: string): DocsHeading[] {
  const createNextHeadingId = createHeadingIdGenerator();

  return source.split(/\r?\n/).flatMap((line): DocsHeading[] => {
    const match = /^(#{2,6})\s+(.+)$/.exec(line);

    if (!match) {
      return [];
    }

    const title = stripMarkdown(match[2] ?? '').trim();

    return title
      ? [
          {
            id: createNextHeadingId(title),
            title,
            level: match[1]?.length ?? 2,
          },
        ]
      : [];
  });
}

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

export const docsManifest: DocsManifest = createDocsManifest({
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
    siteUrl: 'https://chakra-email.test',
    title: 'Chakra Email',
  },
});

const defaultDocsPage = docsManifest.pages[0];

if (!defaultDocsPage) {
  throw new Error('The Chakra Email documentation manifest requires a page.');
}

export function getDocsPage(pathname: string): DocsPage {
  return docsManifest.byRoute[pathname] ?? defaultDocsPage;
}

export function resolveMarkdownHref(
  href: string | undefined,
): string | undefined {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) {
    return href;
  }

  if (href.startsWith('#') || href.startsWith('/')) {
    return href;
  }

  const [path, fragment] = href.split('#', 2);
  const markdownMatch = /(?:^|\/)([^/]+)\.md$/i.exec(path ?? '');

  if (!markdownMatch) {
    return href;
  }

  const pageId = markdownMatch[1];
  const target = docsManifest.pages.find((page) => page.id === pageId);

  if (!target) {
    return `${repositoryUrl}/blob/main/docs/${path}${fragment ? `#${createHeadingId(decodeURIComponent(fragment))}` : ''}`;
  }

  return `${target.route}${fragment ? `#${createHeadingId(decodeURIComponent(fragment))}` : ''}`;
}

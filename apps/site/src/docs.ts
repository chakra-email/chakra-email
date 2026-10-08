import { createHeadingId, type DocsPage } from '@chakra-docs/core';
import { docPages } from './content';
import { createSiteDocsManifest } from './docs-manifest';

export { prepareMarkdown, extractDocsHeadings } from './docs-manifest';

const repositoryUrl = 'https://github.com/chakra-email/chakra-email';
export const docsManifest = createSiteDocsManifest(docPages);

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

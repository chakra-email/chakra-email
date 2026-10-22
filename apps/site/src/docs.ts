import { createHeadingId } from '@chakra-docs/core';
import { docPageDefinitions } from './doc-pages';

export { prepareMarkdown, extractDocsHeadings } from './docs-manifest';

const repositoryUrl = 'https://github.com/chakra-email/chakra-email';

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
  const target = docPageDefinitions.find((page) => page.id === pageId);

  if (!target) {
    return `${repositoryUrl}/blob/main/docs/${path}${fragment ? `#${createHeadingId(decodeURIComponent(fragment))}` : ''}`;
  }

  return `/docs/${target.id}${fragment ? `#${createHeadingId(decodeURIComponent(fragment))}` : ''}`;
}

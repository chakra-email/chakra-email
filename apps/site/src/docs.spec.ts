import { describe, expect, it } from 'vitest';

import {
  docsManifest,
  extractDocsHeadings,
  getDocsPage,
  prepareMarkdown,
  resolveMarkdownHref,
} from './docs';

describe('documentation manifest', () => {
  it('builds indexed pages, navigation, search, and duplicate-safe headings', () => {
    expect(docsManifest.pages).toHaveLength(docsManifest.nav.length);
    expect(docsManifest.search.length).toBeGreaterThan(
      docsManifest.pages.length,
    );
    expect(docsManifest.byRoute['/docs/getting-started']?.title).toBe(
      'Getting Started',
    );
    expect(extractDocsHeadings('## Install\n## Install')).toEqual([
      { id: 'install', title: 'Install', level: 2 },
      { id: 'install-2', title: 'Install', level: 2 },
    ]);
  });

  it('removes the source title because DocsArticle owns the page heading', () => {
    expect(prepareMarkdown('# Getting Started\n\n## Install')).toBe(
      '## Install',
    );
  });

  it('resolves documentation links to manifest routes and repository fallbacks', () => {
    expect(resolveMarkdownHref('markdown.md#URL Portability')).toBe(
      '/docs/markdown#url-portability',
    );
    expect(resolveMarkdownHref('./chakra-v2.md')).toBe('/docs/chakra-v2');
    expect(resolveMarkdownHref('email-client-test-matrix.md')).toBe(
      'https://github.com/chakra-email/chakra-email/blob/main/docs/email-client-test-matrix.md',
    );
    expect(resolveMarkdownHref('https://example.com/docs')).toBe(
      'https://example.com/docs',
    );
  });

  it('uses the first page as the landing-page documentation selection', () => {
    expect(getDocsPage('/').id).toBe('getting-started');
  });
});

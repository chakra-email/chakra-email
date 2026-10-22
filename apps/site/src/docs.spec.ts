import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getRecommendedSearchResults } from './search-recommendations';

import {
  extractDocsHeadings,
  prepareMarkdown,
  resolveMarkdownHref,
} from './docs';
import { docsManifest } from './test/content';
import { resolveSitePage } from './server/pages';

describe('documentation manifest', () => {
  it('gives every public package a valid canonical homepage and documentation anchor', () => {
    const packages = new URL('../../../packages/', import.meta.url);
    for (const directory of readdirSync(packages, { withFileTypes: true })) {
      if (!directory.isDirectory()) continue;
      const manifest = JSON.parse(
        readFileSync(
          new URL(`${directory.name}/package.json`, packages),
          'utf8',
        ),
      );
      if (manifest.private) continue;
      const homepage = new URL(manifest.homepage);
      expect(homepage.origin, manifest.name).toBe('https://chakra.email');
      if (manifest.name !== 'chakra-email') {
        expect(homepage.pathname, manifest.name).toMatch(/^\/docs\//);
      }
      if (homepage.pathname === '/') continue;
      const page = docsManifest.byRoute[homepage.pathname];
      expect(page, manifest.name).toBeDefined();
      if (homepage.hash) {
        expect(
          page.headings?.map(({ id }) => `#${id}`),
          manifest.name,
        ).toContain(homepage.hash);
      }
    }
  });

  it('includes the CodeBlock guide in navigation, search, and the sitemap', () => {
    const route = '/docs/code-block';
    expect(docsManifest.byRoute[route]?.title).toBe('Code Blocks');
    expect(docsManifest.nav.some(({ href }) => href === route)).toBe(true);
    expect(docsManifest.search.some((result) => result.route === route)).toBe(
      true,
    );
    expect(docsManifest.sitemap.some(({ url }) => url === route)).toBe(true);
    expect(resolveMarkdownHref('./code-block.md')).toBe(route);
  });

  it('recommends the six onboarding pages using their manifest metadata', () => {
    const results = getRecommendedSearchResults(docsManifest.search);
    expect(results.map(({ title }) => title)).toEqual([
      'Getting Started',
      'Components',
      'Theming',
      'Rendering',
      'Email Preview',
      'Markdown',
    ]);
    for (const result of results) {
      expect(result.description).toBe(
        docsManifest.byRoute[result.route]?.description,
      );
      expect(result).not.toHaveProperty('text');
      expect(result).not.toHaveProperty('headings');
    }
  });
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
  it('ignores headings inside fenced source examples', () => {
    expect(
      extractDocsHeadings(
        '# Page\n\n```md\n## Not a heading\n```\n\n## Real heading',
      ),
    ).toEqual([{ id: 'real-heading', title: 'Real heading', level: 2 }]);
  });

  it('resolves documentation links to manifest routes and repository fallbacks', () => {
    expect(resolveMarkdownHref(undefined)).toBeUndefined();
    expect(resolveMarkdownHref('#install')).toBe('#install');
    expect(resolveMarkdownHref('/docs/components')).toBe('/docs/components');
    expect(resolveMarkdownHref('README')).toBe('README');
    expect(resolveMarkdownHref('markdown.md#URL Portability')).toBe(
      '/docs/markdown#url-portability',
    );
    expect(resolveMarkdownHref('./chakra-v2.md')).toBe('/docs/chakra-v2');
    expect(resolveMarkdownHref('email-client-test-matrix.md')).toBe(
      'https://github.com/chakra-email/chakra-email/blob/main/docs/email-client-test-matrix.md',
    );
    expect(resolveMarkdownHref('missing.md#More Details')).toBe(
      'https://github.com/chakra-email/chakra-email/blob/main/docs/missing.md#more-details',
    );
    expect(resolveMarkdownHref('https://example.com/docs')).toBe(
      'https://example.com/docs',
    );
  });

  it('uses the first page as the landing-page documentation selection', () => {
    expect(resolveSitePage('/docs', docsManifest)?.id).toBe('getting-started');
  });
});

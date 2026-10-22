import { describe, expect, it } from 'vitest';
import { docsManifest } from './test/content';
import { exampleLinks, packageLinks } from './site-resources';
import { createSiteStructuredData } from './site-structured-data';

describe('site structured data route selection', () => {
  it('uses the canonical documentation page for the /docs alias', () => {
    expect(createSiteStructuredData('/docs', docsManifest)).toEqual(
      createSiteStructuredData('/docs/getting-started', docsManifest),
    );
  });

  it.each([
    '/missing',
    '/404',
    '/og-image',
    '/social-image',
    '/withoss/social-image',
    '/docs/getting-started/social-image',
    '/og-image/docs/getting-started',
  ])('does not describe errors or captures as content: %s', (route) => {
    expect(createSiteStructuredData(route, docsManifest)).toBeUndefined();
  });

  it('keeps canonical page and breadcrumb URLs under the deployment base', () => {
    const json = JSON.stringify(
      createSiteStructuredData('/docs/components', docsManifest, '/email/'),
    );
    expect(json).toContain('https://chakra.email/email/docs/components');
    expect(json).toContain('https://chakra.email/email/docs/getting-started');
    expect(json).not.toContain('https://chakra.email/docs/');
    const home = JSON.stringify(
      createSiteStructuredData('/', docsManifest, '/email/'),
    );
    expect(home).toContain('https://chakra.email/email#software');
  });

  it.each([
    ['/examples', exampleLinks.map((item) => item.href)],
    ['/packages', packageLinks.map((item) => item.href)],
  ] as const)('lists only real visible entries on %s', (route, urls) => {
    const json = JSON.stringify(createSiteStructuredData(route, docsManifest));
    for (const url of urls) expect(json).toContain(url);
    expect(json).toContain('ItemList');
    expect(json).not.toContain('TechArticle');
  });
});

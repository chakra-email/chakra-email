import {
  createDocsLlmsFullText,
  createDocsLlmsText,
  type DocsManifest,
} from '@chakra-docs/core';
import { toSiteHref } from './routing';
import { SITE_URL } from './site-metadata';

export function createSiteLlmsText(
  manifest: DocsManifest,
  basePath = '/',
  full = false,
) {
  const options = {
    title: 'Chakra Email',
    description:
      'Build, theme, preview, and render email-safe React templates with Chakra-style components.',
    siteUrl: SITE_URL,
    markdownUrl: (page: DocsManifest['pages'][number]) =>
      toSiteHref(page.route, basePath),
    details: `Full documentation: [llms-full.txt](${SITE_URL}${toSiteHref('/llms-full.txt', basePath)}).`,
  };
  return full
    ? createDocsLlmsFullText(manifest, options)
    : createDocsLlmsText(manifest, options);
}

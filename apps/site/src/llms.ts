import {
  createDocsLlmsFullText,
  createDocsLlmsText,
  type DocsManifest,
} from '@chakra-docs/core';
import { toSiteHref } from './routing';

export function createSiteLlmsText(
  manifest: DocsManifest,
  basePath = '/',
  full = false,
) {
  const siteUrl = 'https://chakra.email';
  const options = {
    title: 'Chakra Email',
    description:
      'Build, theme, preview, and render email-safe React templates with Chakra-style components.',
    siteUrl,
    markdownUrl: (page: DocsManifest['pages'][number]) =>
      toSiteHref(page.route, basePath),
    details: `Full documentation: [llms-full.txt](${siteUrl}${toSiteHref('/llms-full.txt', basePath)}).`,
  };
  return full
    ? createDocsLlmsFullText(manifest, options)
    : createDocsLlmsText(manifest, options);
}

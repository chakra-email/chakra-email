import { getDocsManifest } from './content';
import { createSiteLlmsText } from '../llms';
import { createSiteRobots, createSiteSitemap } from '../site-seo';

export async function createDiscoveryFiles(basePath = '/') {
  const manifest = await getDocsManifest();
  return {
    'llms.txt': createSiteLlmsText(manifest, basePath),
    'llms-full.txt': createSiteLlmsText(manifest, basePath, true),
    'sitemap.xml': createSiteSitemap(manifest, basePath),
    'robots.txt': createSiteRobots(basePath),
  };
}

export async function discoveryResponse(
  file: keyof Awaited<ReturnType<typeof createDiscoveryFiles>>,
) {
  const files = await createDiscoveryFiles();
  return new Response(files[file], {
    headers: {
      'Content-Type':
        file === 'sitemap.xml'
          ? 'application/xml; charset=utf-8'
          : 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

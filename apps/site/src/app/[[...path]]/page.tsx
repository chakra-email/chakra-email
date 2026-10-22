import { notFound } from 'next/navigation';
import { Graph } from 'react-structured';
import { App } from '../../app';
import { getDocsManifest, getExamples } from '../../server/content';
import { pageMetadata, resolveSitePage } from '../../server/pages';
import { getSiteMetadataRoutes } from '../../site-metadata';
import { createSiteStructuredData } from '../../site-structured-data';
import { getRecommendedSearchResults } from '../../search-recommendations';

type Props = { params: Promise<{ path?: string[] }> };
export const dynamicParams = false;

export async function generateStaticParams() {
  return getSiteMetadataRoutes(await getDocsManifest())
    .filter((route) => route !== '/404')
    .map((route) => ({ path: route === '/' ? [] : route.slice(1).split('/') }));
}
export async function generateMetadata({ params }: Props) {
  return pageMetadata(
    '/' + ((await params).path ?? []).join('/'),
    await getDocsManifest(),
  );
}
export default async function SitePage({ params }: Props) {
  const pathname = '/' + ((await params).path ?? []).join('/');
  const manifest = await getDocsManifest();
  const page = resolveSitePage(pathname, manifest);
  if (!page) notFound();
  const graph = createSiteStructuredData(pathname, manifest);
  return (
    <App
      year={new Date().getFullYear()}
      page={page}
      nav={[
        ...manifest.nav,
        { id: 'examples', title: 'Template examples', href: '/examples' },
        { id: 'packages', title: 'Packages', href: '/packages' },
      ]}
      recommendations={getRecommendedSearchResults(manifest.search)}
      examples={page.id === 'examples' ? await getExamples() : undefined}
    >
      {graph ? <Graph id="page-structured-data" data={graph} /> : null}
    </App>
  );
}

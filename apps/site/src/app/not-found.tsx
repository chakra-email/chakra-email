import { App } from '../app';
import { getDocsManifest } from '../server/content';
import { getRecommendedSearchResults } from '../search-recommendations';

export const metadata = {
  title: 'Page not found - Chakra Email',
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const manifest = await getDocsManifest();
  return (
    <App
      year={new Date().getFullYear()}
      nav={manifest.nav}
      recommendations={getRecommendedSearchResults(manifest.search)}
    />
  );
}

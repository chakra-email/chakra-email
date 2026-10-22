import { createMiniSearchEngine } from '@chakra-docs/search/minisearch';
import { createFetchSearchHandler } from '@chakra-docs/search/http';
import { getDocsManifest } from './content';

let enginePromise:
  | Promise<ReturnType<typeof createMiniSearchEngine>>
  | undefined;
export const searchHandler = createFetchSearchHandler(
  async (query, options) => {
    options?.signal?.throwIfAborted();
    const loadEngine = () =>
      getDocsManifest().then((manifest) =>
        createMiniSearchEngine(manifest.search),
      );
    const engine = await (process.env.NODE_ENV === 'production'
      ? (enginePromise ??= loadEngine())
      : loadEngine());
    options?.signal?.throwIfAborted();
    return engine.search(query);
  },
  {
    maxQueryLength: 200,
    maxResults: 20,
    cacheControl:
      'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
  },
);

import { afterEach, describe, expect, it, vi } from 'vitest';
import SitePage, {
  generateMetadata,
  generateStaticParams,
} from '../app/[[...path]]/page';
import NotFound from '../app/not-found';
import * as content from './content';
import { docsManifest } from '../test/content';

describe('Next server page contracts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prerenders public routes and captures without inventing a /404 page', async () => {
    vi.spyOn(content, 'getDocsManifest').mockResolvedValue(docsManifest);
    const routes = await generateStaticParams();
    expect(routes).toContainEqual({ path: [] });
    expect(routes).toContainEqual({ path: ['docs', 'getting-started'] });
    expect(routes).toContainEqual({
      path: ['docs', 'getting-started', 'social-image'],
    });
    expect(routes).not.toContainEqual({ path: ['404'] });
    expect(new Set(routes.map(({ path }) => path.join('/'))).size).toBe(
      routes.length,
    );
  });

  it('passes only the selected page and compact recommendations to the client', async () => {
    vi.spyOn(content, 'getDocsManifest').mockResolvedValue(docsManifest);
    const props = { params: Promise.resolve({ path: ['docs', 'components'] }) };
    const element = await SitePage(props);
    expect(element.props.page.id).toBe('components');
    expect(element.props.examples).toBeUndefined();
    expect(element.props.recommendations).toHaveLength(6);
    expect(element.props).not.toHaveProperty('manifest');
    expect(element.props).not.toHaveProperty('search');
    expect(element.props.recommendations[0]).not.toHaveProperty('text');
    expect(element.props.children).toBeTruthy();
    expect((await generateMetadata(props)).alternates?.canonical).toBe(
      'https://chakra.email/docs/components',
    );
  });

  it('loads example source only for the examples page and omits JSON-LD on captures', async () => {
    vi.spyOn(content, 'getDocsManifest').mockResolvedValue(docsManifest);
    const examples = await SitePage({
      params: Promise.resolve({ path: ['examples'] }),
    });
    expect(examples.props.examples).toHaveLength(4);
    const capture = await SitePage({
      params: Promise.resolve({ path: ['og-image'] }),
    });
    expect(capture.props.children).toBeNull();
    expect(capture.props.page.id).toBe('welcome');
  });

  it('uses Next notFound for unknown pages and keeps the helpful error shell', async () => {
    vi.spyOn(content, 'getDocsManifest').mockResolvedValue(docsManifest);
    await expect(
      SitePage({ params: Promise.resolve({ path: ['missing'] }) }),
    ).rejects.toThrow('404');
    const element = await NotFound();
    expect(element.props.page).toBeUndefined();
    expect(element.props.recommendations).toHaveLength(6);
  });
});

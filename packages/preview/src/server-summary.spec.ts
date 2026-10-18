import type { PreviewHttpDependencies } from './http-handler.js';
import type { TemplateRegistry } from './discovery.js';
import type { TemplateWatchEvent } from './vite-loader.js';
import type { PreviewRenderResponse } from './protocol.js';
import { createPreviewServer } from './server.js';
import { EventHub } from './event-hub.js';

const mocks = vi.hoisted(() => ({
  discover: vi.fn(),
  load: vi.fn(),
  render: vi.fn(),
  close: vi.fn(),
  handler: vi.fn(),
  watch: undefined as undefined | ((event: TemplateWatchEvent) => void),
}));
vi.mock('./discovery.js', () => ({ discoverTemplates: mocks.discover }));
vi.mock('./render-template.js', () => ({ renderTemplate: mocks.render }));
vi.mock('./vite-loader.js', () => ({
  createTemplateModuleLoader: async (
    _config: unknown,
    watch: (event: TemplateWatchEvent) => void,
  ) => {
    mocks.watch = watch;
    return { load: mocks.load, close: mocks.close };
  },
}));
vi.mock('./http-handler.js', () => ({
  createPreviewHttpHandler: mocks.handler,
}));

function registry(ids = ['a', 'b']): TemplateRegistry {
  const templates = ids.map((id) => ({
    id,
    name: id,
    path: `${id}.tsx`,
    absolutePath: `/templates/${id}.tsx`,
  }));
  return {
    templates,
    byId: new Map(templates.map((template) => [template.id, template])),
  };
}
const output = (id = 'a'): PreviewRenderResponse => ({
  id,
  name: id,
  html: '<p>Hello</p>',
  text: 'Hello',
  source: '',
  subject: 'Hello',
  props: {},
  variants: [],
  lint: [],
});

describe('preview server background summary integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.discover.mockReset().mockResolvedValue(registry());
    mocks.load.mockReset().mockResolvedValue({ default: () => null });
    mocks.render
      .mockReset()
      .mockImplementation(async ({ template }) => output(template.id));
    mocks.close.mockReset().mockResolvedValue(undefined);
    mocks.handler.mockReset().mockReturnValue(async () => undefined);
    mocks.watch = undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('summarizes default fixtures after discovery, refreshes on changes, and closes cleanly', async () => {
    const publish = vi.spyOn(EventHub.prototype, 'publish');
    const preview = await createPreviewServer({
      config: {
        root: process.cwd(),
        previewFrom: 'Forward <hello@forward.domains>',
        lint: { rules: { 'document-title': 'off' } },
      },
    });
    try {
      await vi.advanceTimersByTimeAsync(502);
      expect(publish).toHaveBeenCalledWith('lint-summary', {
        generation: 1,
        templates: [
          { id: 'a', error: 0, warning: 0, info: 0 },
          { id: 'b', error: 0, warning: 0, info: 0 },
        ],
      });
      for (const [options] of mocks.render.mock.calls) {
        expect(options).toMatchObject({
          previewFrom: { name: 'Forward', address: 'hello@forward.domains' },
          lintRules: { 'document-title': 'off' },
        });
        expect(options).not.toHaveProperty('variant');
        expect(options).not.toHaveProperty('props');
      }
      mocks.watch?.({ event: 'change', path: '/templates/a.tsx' });
      await vi.advanceTimersByTimeAsync(502);
      expect(publish).toHaveBeenCalledWith(
        'lint-summary',
        expect.objectContaining({ generation: 2 }),
      );
    } finally {
      await preview.close();
    }
    const count = publish.mock.calls.length;
    mocks.watch?.({ event: 'change', path: '/templates/a.tsx' });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(publish).toHaveBeenCalledTimes(count);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('summarizes the refreshed registry after additions or removals', async () => {
    const publish = vi.spyOn(EventHub.prototype, 'publish');
    const preview = await createPreviewServer({
      config: { root: process.cwd() },
    });
    try {
      await vi.advanceTimersByTimeAsync(502);
      mocks.discover.mockResolvedValue(registry(['c']));
      mocks.watch?.({ event: 'unlink', path: '/templates/a.tsx' });
      await vi.advanceTimersByTimeAsync(552);
      expect(publish).toHaveBeenLastCalledWith('lint-summary', {
        generation: 2,
        templates: [{ id: 'c', error: 0, warning: 0, info: 0 }],
      });
    } finally {
      await preview.close();
    }
  });

  it('gives explicit renders priority without passing their edits into background summaries', async () => {
    const preview = await createPreviewServer({
      config: { root: process.cwd() },
    });
    try {
      const dependencies = mocks.handler.mock
        .calls[0]?.[0] as PreviewHttpDependencies;
      let finish!: (value: PreviewRenderResponse) => void;
      mocks.render.mockImplementationOnce(
        () =>
          new Promise<PreviewRenderResponse>((resolve) => {
            finish = resolve;
          }),
      );
      const foreground = dependencies.render({
        id: 'a',
        props: { name: 'Grace' },
        variant: 'edited',
      });
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(502);
      expect(mocks.render).toHaveBeenCalledTimes(1);
      expect(mocks.render.mock.calls[0]?.[0]).toMatchObject({
        props: { name: 'Grace' },
        variant: 'edited',
      });
      finish(output());
      await foreground;
      await vi.advanceTimersByTimeAsync(2);
      expect(mocks.render).toHaveBeenCalledTimes(3);
      expect(mocks.render.mock.calls[1]?.[0]).not.toHaveProperty('props');
    } finally {
      await preview.close();
    }
  });

  it('does not replace newer discovery with a stale asynchronous refresh', async () => {
    const preview = await createPreviewServer({
      config: { root: process.cwd() },
    });
    try {
      const dependencies = mocks.handler.mock
        .calls[0]?.[0] as PreviewHttpDependencies;
      let finish!: (value: TemplateRegistry) => void;
      mocks.discover.mockImplementationOnce(
        () =>
          new Promise<TemplateRegistry>((resolve) => {
            finish = resolve;
          }),
      );
      mocks.watch?.({ event: 'add', path: '/templates/old.tsx' });
      await vi.advanceTimersByTimeAsync(51);
      mocks.discover.mockResolvedValueOnce(registry(['new']));
      mocks.watch?.({ event: 'add', path: '/templates/new.tsx' });
      await vi.advanceTimersByTimeAsync(51);
      expect(
        dependencies.getRegistry().templates.map((template) => template.id),
      ).toEqual(['new']);
      finish(registry(['old']));
      await Promise.resolve();
      await Promise.resolve();
      expect(
        dependencies.getRegistry().templates.map((template) => template.id),
      ).toEqual(['new']);
    } finally {
      await preview.close();
    }
  });
});

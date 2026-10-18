import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalizeConfig } from './config.js';
import { EventHub } from './event-hub.js';
import { createPreviewHttpHandler } from './http-handler.js';

describe('open editor API security', () => {
  async function request(
    options: {
      host?: string;
      openInEditor?: boolean;
      origin?: string;
      token?: string;
      method?: string;
      body?: unknown;
      contentType?: string;
      requestHost?: string;
    } = {},
  ) {
    const launcher = vi.fn<(path: string) => Promise<void>>();
    const events = new EventHub();
    const handler = createPreviewHttpHandler({
      allowRemote: true,
      config: normalizeConfig({
        host: options.host ?? '127.0.0.1',
        openInEditor: options.openInEditor,
      }),
      events,
      getRegistry: () => ({
        templates: [],
        byId: new Map([
          [
            'known',
            {
              id: 'known',
              name: 'Known',
              path: 'emails/known.tsx',
              absolutePath: '/project/emails/known.tsx',
            },
          ],
        ]),
      }),
      render: vi.fn(),
      openInEditor: launcher,
      token: 'secret',
      uiRoot: '/ui',
    });
    const incoming = Readable.from([
      JSON.stringify(options.body ?? { id: 'known' }),
    ]) as IncomingMessage;
    incoming.url = '/api/open';
    incoming.method = options.method ?? 'POST';
    incoming.headers = {
      host: options.requestHost ?? '127.0.0.1',
      'content-type': options.contentType ?? 'application/json',
      'x-chakra-email-preview-token': options.token ?? 'secret',
      ...(options.origin ? { origin: options.origin } : {}),
    };
    const response = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
    try {
      await handler(incoming, response as unknown as ServerResponse);
      return { launcher, response };
    } finally {
      events.close();
    }
  }

  it.each([
    [{ host: '0.0.0.0' }, 403],
    [{ host: '::' }, 403],
    [{ host: '192.168.1.20' }, 403],
    [{ openInEditor: false }, 403],
    [{ token: 'wrong' }, 401],
    [{ origin: 'https://attacker.example' }, 403],
    [{ method: 'GET' }, 405],
    [{ contentType: 'text/plain' }, 415],
    [{ requestHost: 'attacker.example' }, 400],
    [{ body: { path: '/etc/passwd' } }, 400],
    [{ body: { id: 'unknown' } }, 404],
  ])('refuses unsafe editor request %#', async (options, status) => {
    const { launcher, response } = await request(options);
    expect(response.statusCode).toBe(status);
    expect(launcher).not.toHaveBeenCalled();
  });
  it('uses only a discovered absolute source path', async () => {
    const { launcher, response } = await request({
      body: { id: 'known', path: '/etc/passwd' },
    });
    expect(response.statusCode).toBe(204);
    expect(launcher).toHaveBeenCalledExactlyOnceWith(
      '/project/emails/known.tsx',
    );
  });
});

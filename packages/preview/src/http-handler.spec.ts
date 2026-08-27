import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, get, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeConfig } from './config.js';
import type { RegisteredTemplate, TemplateRegistry } from './discovery.js';
import { EventHub } from './event-hub.js';
import { createPreviewHttpHandler } from './http-handler.js';
import type { PreviewRenderResponse } from './protocol.js';

describe('preview HTTP handler', () => {
  let baseUrl: string;
  let directory: string;
  let events: EventHub;
  let server: Server;
  const token = 'test-preview-token';
  const send = vi.fn(async () => ({ id: 'sent-id', message: 'Delivered.' }));

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'chakra-email-http-'));
    await mkdir(join(directory, 'ui', 'assets'), { recursive: true });
    await mkdir(join(directory, 'public'), { recursive: true });
    await writeFile(
      join(directory, 'ui', 'index.html'),
      '<meta name="preview-token" content="__CHAKRA_EMAIL_PREVIEW_TOKEN__"><meta name="preview-theme" content="__CHAKRA_EMAIL_PREVIEW_THEME__"><main>Preview</main>',
    );
    await writeFile(join(directory, 'ui', 'assets', 'app.js'), 'export {};');
    await writeFile(join(directory, 'public', 'logo.txt'), 'logo');

    const config = normalizeConfig(
      {
        assets: 'public',
        host: '127.0.0.1',
        port: 0,
        templates: 'emails',
        theme: {
          semanticTokens: {
            colors: { preview: { accent: { value: '#111111' } } },
          },
        },
      },
      undefined,
      directory,
    );
    const template: RegisteredTemplate = {
      absolutePath: join(directory, 'emails', 'welcome.tsx'),
      id: 'template-id',
      name: 'Welcome',
      path: 'emails/welcome.tsx',
    };
    const registry: TemplateRegistry = {
      byId: new Map([[template.id, template]]),
      templates: [
        { id: template.id, name: template.name, path: template.path },
      ],
    };
    const rendered: PreviewRenderResponse = {
      html: '<p>Hello</p>',
      id: template.id,
      lint: [],
      name: template.name,
      props: {},
      source: 'export default Welcome;',
      text: 'Hello',
      variants: [],
    };
    events = new EventHub();
    send.mockClear();
    const handler = createPreviewHttpHandler({
      allowRemote: false,
      config,
      events,
      getRegistry: () => registry,
      render: async () => rendered,
      send,
      token,
      uiRoot: join(directory, 'ui'),
    });
    server = createServer((request, response) => {
      void handler(request, response);
    });
    await new Promise<void>((resolveListen) => {
      server.listen(0, '127.0.0.1', resolveListen);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind.');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    events.close();
    await new Promise<void>((resolveClose, reject) => {
      server.close((error) => (error ? reject(error) : resolveClose()));
    });
    await rm(directory, { force: true, recursive: true });
  });

  it('serves health, token-injected UI, UI assets, and configured assets', async () => {
    const health = await fetch(`${baseUrl}/api/health`);
    await expect(health.json()).resolves.toEqual({ status: 'ok' });

    const index = await fetch(baseUrl);
    const indexHtml = await index.text();
    expect(indexHtml).toContain(`content="${token}"`);
    const encodedTheme = Buffer.from(
      JSON.stringify({
        semanticTokens: {
          colors: { preview: { accent: { value: '#111111' } } },
        },
      }),
    ).toString('base64url');
    expect(indexHtml).toContain(`content="${encodedTheme}"`);
    expect(index.headers.get('content-security-policy')).toContain(
      "default-src 'self'",
    );

    await expect(
      fetch(`${baseUrl}/__preview/assets/app.js`).then((value) => value.text()),
    ).resolves.toContain('export');
    await expect(
      fetch(`${baseUrl}/assets/logo.txt`).then((value) => value.text()),
    ).resolves.toBe('logo');
  });

  it('protects template and render APIs with the per-process token', async () => {
    expect((await fetch(`${baseUrl}/api/templates`)).status).toBe(401);

    const templates = await fetch(`${baseUrl}/api/templates`, {
      headers: { 'x-chakra-email-preview-token': token },
    });
    await expect(templates.json()).resolves.toEqual({
      capabilities: { testSend: true },
      templates: [
        { id: 'template-id', name: 'Welcome', path: 'emails/welcome.tsx' },
      ],
    });

    const rendered = await fetch(`${baseUrl}/api/render`, {
      body: JSON.stringify({ id: 'template-id' }),
      headers: {
        'content-type': 'application/json',
        'x-chakra-email-preview-token': token,
      },
      method: 'POST',
    });
    expect(rendered.status).toBe(200);
    await expect(rendered.json()).resolves.toMatchObject({ text: 'Hello' });
  });

  it('validates and delegates authenticated test sends', async () => {
    const headers = {
      'content-type': 'application/json',
      'x-chakra-email-preview-token': token,
    };
    const sent = await fetch(`${baseUrl}/api/send`, {
      body: JSON.stringify({
        id: 'template-id',
        props: { firstName: 'Ada' },
        subject: 'Welcome Ada',
        to: ' ada@example.com ',
        variant: 'friendly',
      }),
      headers,
      method: 'POST',
    });

    expect(sent.status).toBe(200);
    await expect(sent.json()).resolves.toEqual({
      id: 'sent-id',
      message: 'Delivered.',
    });
    expect(send).toHaveBeenCalledWith({
      id: 'template-id',
      props: { firstName: 'Ada' },
      subject: 'Welcome Ada',
      to: 'ada@example.com',
      variant: 'friendly',
    });

    const invalid = await fetch(`${baseUrl}/api/send`, {
      body: JSON.stringify({ id: 'template-id', to: 'not-an-email' }),
      headers,
      method: 'POST',
    });
    expect(invalid.status).toBe(400);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('streams invalidation events over authenticated SSE', async () => {
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}/api/events?token=${token}`, {
      signal: controller.signal,
    });
    expect(response.status).toBe(200);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    const decoder = new TextDecoder();
    const connected = await reader?.read();
    expect(decoder.decode(connected?.value)).toContain('connected');

    events.broadcast('invalidate');
    const invalidated = await reader?.read();
    expect(decoder.decode(invalidated?.value)).toContain('event: invalidate');
    await reader?.cancel();
    controller.abort();
  });

  it('rejects invalid methods, media types, origins, IDs, and oversized bodies', async () => {
    const headers = { 'x-chakra-email-preview-token': token };
    expect(
      (await fetch(`${baseUrl}/api/templates`, { headers, method: 'POST' }))
        .status,
    ).toBe(405);
    expect(
      (
        await fetch(`${baseUrl}/api/render`, {
          body: '{}',
          headers,
          method: 'POST',
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await fetch(`${baseUrl}/api/render`, {
          body: JSON.stringify({ id: 'template-id' }),
          headers: {
            ...headers,
            'content-type': 'application/json',
            origin: 'http://attacker.example',
          },
          method: 'POST',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${baseUrl}/api/render`, {
          body: JSON.stringify({ id: 'missing' }),
          headers: { ...headers, 'content-type': 'application/json' },
          method: 'POST',
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await fetch(`${baseUrl}/api/render`, {
          body: JSON.stringify({
            id: 'template-id',
            props: { value: 'x'.repeat(70_000) },
          }),
          headers: { ...headers, 'content-type': 'application/json' },
          method: 'POST',
        })
      ).status,
    ).toBe(400);
  });

  it('rejects DNS-rebinding Host headers', async () => {
    const status = await new Promise<number | undefined>(
      (resolveStatus, reject) => {
        const request = get(
          `${baseUrl}/api/health`,
          {
            headers: { host: 'attacker.example' },
          },
          (response) => {
            response.resume();
            resolveStatus(response.statusCode);
          },
        );
        request.once('error', reject);
      },
    );
    expect(status).toBe(400);
  });
});

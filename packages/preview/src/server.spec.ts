import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPreviewServer } from './server.js';

describe('createPreviewServer', () => {
  it('discovers and renders a real TSX template through Vite', async () => {
    const uiRoot = await mkdtemp(join(tmpdir(), 'chakra-email-server-ui-'));
    await writeFile(
      join(uiRoot, 'index.html'),
      '<meta content="__CHAKRA_EMAIL_PREVIEW_TOKEN__">',
    );
    const preview = await createPreviewServer({
      config: {
        assets: 'public',
        root: resolve(process.cwd(), '../../examples/preview'),
        templates: 'emails',
      },
      port: 0,
      uiRoot,
    });

    try {
      const address = await preview.listen();
      const headers = { 'x-chakra-email-preview-token': address.token };
      const templatesResponse = await fetch(`${address.url}/api/templates`, {
        headers,
      });
      const templates = (await templatesResponse.json()) as {
        templates: Array<{ id: string }>;
      };
      expect(templates.templates).toHaveLength(1);

      const renderResponse = await fetch(`${address.url}/api/render`, {
        body: JSON.stringify({
          id: templates.templates[0]?.id,
          variant: 'trial-ending',
        }),
        headers: { ...headers, 'content-type': 'application/json' },
        method: 'POST',
      });
      expect(renderResponse.status).toBe(200);
      const rendered = (await renderResponse.json()) as {
        html: string;
        lint: Array<{ ruleId: string }>;
        source: string;
        subject: string;
        text: string;
        variants: string[];
      };
      expect(rendered.html).toContain('<!DOCTYPE html');
      expect(rendered.html).toContain('data-chakra-email-color-mode="system"');
      expect(rendered.html).toContain('prefers-color-scheme: dark');
      expect(rendered.lint).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ruleId: 'document-title' }),
        ]),
      );
      expect(rendered.text.toLowerCase()).toContain('trial');
      expect(rendered.source).toContain('previewVariants');
      expect(rendered.subject).toBe('Welcome to Field Notes');
      expect(rendered.variants).toEqual(['new-founder', 'trial-ending']);

      const index = await fetch(address.url);
      expect(await index.text()).toContain(address.token);
    } finally {
      await preview.close();
      await rm(uiRoot, { force: true, recursive: true });
    }
  }, 30_000);

  it('requires an explicit opt-in for non-loopback hosts', async () => {
    await expect(
      createPreviewServer({
        config: { host: '0.0.0.0', root: process.cwd(), templates: 'missing' },
      }),
    ).rejects.toThrow('allowRemote');
  });

  it('streams initial default lint summaries and replays them to late subscribers', async () => {
    const uiRoot = await mkdtemp(join(tmpdir(), 'chakra-email-summary-ui-'));
    const preview = await createPreviewServer({
      config: {
        root: resolve(process.cwd(), '../../examples/preview'),
        templates: 'emails',
      },
      port: 0,
      uiRoot,
    });
    const readers: Array<ReadableStreamDefaultReader<Uint8Array>> = [];
    try {
      const address = await preview.listen();
      const readSummary = async (timeout: number) => {
        const response = await fetch(`${address.url}/api/events`, {
          headers: { 'x-chakra-email-preview-token': address.token },
          signal: AbortSignal.timeout(timeout),
        });
        expect(response.status).toBe(200);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Missing event stream.');
        readers.push(reader);
        const decoder = new TextDecoder();
        let data = '';
        while (!/event: lint-summary\ndata: ([^\n]+)\n\n/u.test(data)) {
          const chunk = await reader.read();
          if (chunk.done)
            throw new Error('Event stream ended without a summary.');
          data += decoder.decode(chunk.value, { stream: true });
        }
        return JSON.parse(
          /event: lint-summary\ndata: ([^\n]+)\n\n/u.exec(data)?.[1] ?? '{}',
        ) as {
          generation: number;
          templates: Array<{
            id: string;
            error: number;
            warning: number;
            info: number;
          }>;
        };
      };
      const first = await readSummary(10_000);
      expect(first.generation).toBeGreaterThan(0);
      expect(first.templates).toHaveLength(1);
      expect(first.templates[0]).toMatchObject({
        error: expect.any(Number),
        warning: expect.any(Number),
        info: expect.any(Number),
      });
      // No new render or watcher change is needed for a late connection.
      await expect(readSummary(2_000)).resolves.toEqual(first);
    } finally {
      await Promise.all(
        readers.map((reader) => reader.cancel().catch(() => undefined)),
      );
      await preview.close();
      await rm(uiRoot, { force: true, recursive: true });
    }
  }, 30_000);

  it('applies config lint overrides to real template renders served to the browser', async () => {
    const uiRoot = await mkdtemp(join(tmpdir(), 'chakra-email-lint-ui-'));
    const preview = await createPreviewServer({
      config: {
        root: resolve(process.cwd(), '../../examples/preview'),
        templates: 'emails',
        lint: { rules: { 'document-title': 'off' } },
      },
      port: 0,
      uiRoot,
    });
    try {
      const address = await preview.listen();
      const headers = { 'x-chakra-email-preview-token': address.token };
      const templates = (await (
        await fetch(`${address.url}/api/templates`, { headers })
      ).json()) as { templates: Array<{ id: string }> };
      const response = await fetch(`${address.url}/api/render`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ id: templates.templates[0]?.id }),
      });
      expect(response.status).toBe(200);
      const result = (await response.json()) as {
        html: string;
        lint: Array<{ ruleId: string }>;
      };
      expect(result.html).toContain('<!DOCTYPE html');
      expect(
        result.lint.some((finding) => finding.ruleId === 'document-title'),
      ).toBe(false);
    } finally {
      await preview.close();
      await rm(uiRoot, { force: true, recursive: true });
    }
  }, 30_000);

  it('renders and delegates test sends through the configured transport', async () => {
    const uiRoot = await mkdtemp(join(tmpdir(), 'chakra-email-send-ui-'));
    await writeFile(
      join(uiRoot, 'index.html'),
      '<meta content="__CHAKRA_EMAIL_PREVIEW_TOKEN__">',
    );
    const send = vi.fn(async () => ({ id: 'provider-message-id' }));
    const preview = await createPreviewServer({
      config: {
        root: resolve(process.cwd(), '../../examples/preview'),
        templates: 'emails',
        testSend: { send },
      },
      port: 0,
      uiRoot,
    });

    try {
      const address = await preview.listen();
      const headers = { 'x-chakra-email-preview-token': address.token };
      const templatesResponse = await fetch(`${address.url}/api/templates`, {
        headers,
      });
      const templates = (await templatesResponse.json()) as {
        capabilities: { testSend: boolean };
        templates: Array<{ id: string }>;
      };
      expect(templates.capabilities.testSend).toBe(true);

      const response = await fetch(`${address.url}/api/send`, {
        body: JSON.stringify({
          id: templates.templates[0]?.id,
          to: 'test@example.com',
          variant: 'trial-ending',
        }),
        headers: { ...headers, 'content-type': 'application/json' },
        method: 'POST',
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        id: 'provider-message-id',
      });
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('<!DOCTYPE html'),
          subject: 'Welcome to Field Notes',
          text: expect.stringContaining('2 days remaining'),
          to: 'test@example.com',
          variant: 'trial-ending',
        }),
      );
    } finally {
      await preview.close();
      await rm(uiRoot, { force: true, recursive: true });
    }
  }, 30_000);

  it('closes its module loader when the HTTP port cannot be bound', async () => {
    const blocker = createHttpServer();
    await new Promise<void>((resolveListen) => {
      blocker.listen(0, '127.0.0.1', resolveListen);
    });
    const port = (blocker.address() as AddressInfo).port;
    const preview = await createPreviewServer({
      config: {
        root: resolve(process.cwd(), '../../examples/preview'),
        templates: 'emails',
      },
      port,
    });

    try {
      await expect(preview.listen()).rejects.toMatchObject({
        code: 'EADDRINUSE',
      });
      await expect(preview.listen()).rejects.toThrow('closed');
    } finally {
      await preview.close();
      await new Promise<void>((resolveClose, reject) => {
        blocker.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolveClose();
          }
        });
      });
    }
  });
});

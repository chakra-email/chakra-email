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
        text: string;
        variants: string[];
      };
      expect(rendered.html).toContain('<!DOCTYPE html');
      expect(rendered.lint).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ruleId: 'document-title' }),
        ]),
      );
      expect(rendered.text.toLowerCase()).toContain('trial');
      expect(rendered.source).toContain('previewVariants');
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

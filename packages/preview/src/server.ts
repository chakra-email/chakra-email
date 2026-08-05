import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  loadPreviewConfig,
  normalizeConfig,
  type PreviewConfig,
  type ResolvedPreviewConfig,
} from './config.js';
import { discoverTemplates, type TemplateRegistry } from './discovery.js';
import { EventHub } from './event-hub.js';
import { createPreviewHttpHandler } from './http-handler.js';
import type {
  PreviewRenderRequest,
  PreviewRenderResponse,
} from './protocol.js';
import { renderTemplate } from './render-template.js';
import {
  createTemplateModuleLoader,
  type TemplateModuleLoader,
  type TemplateWatchEvent,
} from './vite-loader.js';

export interface CreatePreviewServerOptions {
  allowRemote?: boolean;
  config?: PreviewConfig;
  configFile?: string;
  cwd?: string;
  host?: string;
  port?: number;
  /** Primarily useful to embedders and integration tests. */
  uiRoot?: string;
}

export interface PreviewServerAddress {
  host: string;
  port: number;
  token: string;
  url: string;
}

export interface PreviewServer {
  close(): Promise<void>;
  listen(): Promise<PreviewServerAddress>;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[|\]$/gu, '');
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized.startsWith('127.')
  );
}

async function resolveConfig(
  options: CreatePreviewServerOptions,
): Promise<ResolvedPreviewConfig> {
  if (options.config && options.configFile) {
    throw new Error('Provide either config or configFile, not both.');
  }
  const overrides = {
    ...(options.host !== undefined ? { host: options.host } : {}),
    ...(options.port !== undefined ? { port: options.port } : {}),
  };
  if (options.config) {
    return normalizeConfig(
      { ...options.config, ...overrides },
      undefined,
      options.cwd,
    );
  }
  return loadPreviewConfig({
    configFile: options.configFile,
    cwd: options.cwd,
    overrides,
  });
}

function listenHttpServer(
  server: HttpServer,
  config: ResolvedPreviewConfig,
): Promise<AddressInfo> {
  return new Promise((resolveListen, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Preview server did not provide a TCP address.'));
        return;
      }
      resolveListen(address);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(config.port, config.host);
  });
}

function closeHttpServer(server: HttpServer): Promise<void> {
  if (!server.listening) {
    return Promise.resolve();
  }
  return new Promise((resolveClose, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolveClose();
      }
    });
    server.closeIdleConnections();
  });
}

export async function createPreviewServer(
  options: CreatePreviewServerOptions = {},
): Promise<PreviewServer> {
  const config = await resolveConfig(options);
  const allowRemote = options.allowRemote ?? false;
  if (!isLoopbackHost(config.host) && !allowRemote) {
    throw new Error(
      `Refusing to bind preview to non-loopback host ${config.host}. Pass allowRemote: true or --allow-remote to opt in.`,
    );
  }

  let registry = await discoverTemplates(config);
  const events = new EventHub();
  let refreshTimer: NodeJS.Timeout | undefined;
  let closed = false;

  const refreshRegistry = (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      void discoverTemplates(config)
        .then((nextRegistry) => {
          registry = nextRegistry;
          events.broadcast('templates');
        })
        .catch(() => {
          events.broadcast('invalidate');
        });
    }, 50);
    refreshTimer.unref();
  };

  const onWatchEvent = (watchEvent: TemplateWatchEvent): void => {
    if (
      watchEvent.event === 'add' ||
      watchEvent.event === 'addDir' ||
      watchEvent.event === 'unlink' ||
      watchEvent.event === 'unlinkDir'
    ) {
      refreshRegistry();
    } else {
      events.broadcast('invalidate');
    }
  };

  let moduleLoader: TemplateModuleLoader;
  try {
    moduleLoader = await createTemplateModuleLoader(config, onWatchEvent);
  } catch (error) {
    events.close();
    throw error;
  }

  const token = randomBytes(32).toString('base64url');
  const uiRoot =
    options.uiRoot ?? fileURLToPath(new URL('./ui', import.meta.url));

  const renderRequest = async (
    request: PreviewRenderRequest,
  ): Promise<PreviewRenderResponse> => {
    const template = registry.byId.get(request.id);
    if (!template) {
      throw new Error('Template was not found.');
    }
    return renderTemplate({
      module: await moduleLoader.load(template.absolutePath),
      props: request.props,
      template,
      variant: request.variant,
    });
  };

  const getRegistry = (): TemplateRegistry => registry;
  const handler = createPreviewHttpHandler({
    allowRemote,
    config,
    events,
    getRegistry,
    render: renderRequest,
    token,
    uiRoot,
  });
  const httpServer = createHttpServer((request, response) => {
    void handler(request, response);
  });
  httpServer.requestTimeout = 30_000;
  httpServer.headersTimeout = 10_000;
  httpServer.keepAliveTimeout = 5_000;

  let address: PreviewServerAddress | undefined;
  let listenPromise: Promise<PreviewServerAddress> | undefined;

  const closeResources = async (): Promise<void> => {
    if (closed) {
      return;
    }
    closed = true;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    events.close();
    await Promise.all([closeHttpServer(httpServer), moduleLoader.close()]);
  };

  return {
    close: closeResources,
    async listen() {
      if (closed) {
        throw new Error('Preview server is closed.');
      }
      if (address) {
        return address;
      }
      listenPromise ??= (async () => {
        try {
          const bound = await listenHttpServer(httpServer, config);
          const displayHost =
            config.host === '0.0.0.0' || config.host === '::'
              ? 'localhost'
              : config.host;
          const urlHost = displayHost.includes(':')
            ? `[${displayHost}]`
            : displayHost;
          address = {
            host: config.host,
            port: bound.port,
            token,
            url: `http://${urlHost}:${bound.port}`,
          };
          return address;
        } catch (error) {
          await closeResources();
          throw error;
        }
      })();
      return listenPromise;
    },
  };
}

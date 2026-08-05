import { timingSafeEqual } from 'node:crypto';
import { stat, readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { ResolvedPreviewConfig } from './config.js';
import type { TemplateRegistry } from './discovery.js';
import type { EventHub } from './event-hub.js';
import type {
  PreviewErrorResponse,
  PreviewRenderRequest,
  PreviewRenderResponse,
  PreviewTemplatesResponse,
} from './protocol.js';

const MAX_BODY_BYTES = 64 * 1024;
const TOKEN_HEADER = 'x-chakra-email-preview-token';
const TOKEN_PLACEHOLDER = '__CHAKRA_EMAIL_PREVIEW_TOKEN__';

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export interface PreviewHttpDependencies {
  allowRemote: boolean;
  config: ResolvedPreviewConfig;
  events: EventHub;
  getRegistry(): TemplateRegistry;
  render(request: PreviewRenderRequest): Promise<PreviewRenderResponse>;
  token: string;
  uiRoot: string;
}

function setCommonHeaders(response: ServerResponse): void {
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('referrer-policy', 'no-referrer');
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  setCommonHeaders(response);
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(`${JSON.stringify(body)}\n`);
}

function sendText(
  response: ServerResponse,
  status: number,
  body: string,
): void {
  setCommonHeaders(response);
  response.statusCode = status;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(body);
}

function secureTokenEquals(
  actual: string | undefined,
  expected: string,
): boolean {
  if (!actual) {
    return false;
  }
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function hostnameFromHostHeader(value: string): string | undefined {
  try {
    return new URL(`http://${value}`).hostname
      .toLowerCase()
      .replace(/^\[|\]$/gu, '');
  } catch {
    return undefined;
  }
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.startsWith('127.')
  );
}

function isAllowedHost(
  hostHeader: string | undefined,
  config: ResolvedPreviewConfig,
  allowRemote: boolean,
): boolean {
  if (!hostHeader) {
    return false;
  }
  const hostname = hostnameFromHostHeader(hostHeader);
  if (!hostname) {
    return false;
  }
  const configured = config.host.toLowerCase().replace(/^\[|\]$/gu, '');
  if (
    hostname === configured ||
    (isLoopback(configured) && isLoopback(hostname))
  ) {
    return true;
  }
  return allowRemote && (isIP(hostname) !== 0 || hostname === 'localhost');
}

function requestToken(request: IncomingMessage, url: URL): string | undefined {
  const header = request.headers[TOKEN_HEADER];
  if (typeof header === 'string') {
    return header;
  }
  return url.searchParams.get('token') ?? undefined;
}

function isSameOriginRequest(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) {
    return true;
  }
  try {
    const originUrl = new URL(origin);
    return originUrl.host === request.headers.host;
  } catch {
    return false;
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new Error('Request body is too large.');
  }
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as Uint8Array);
    length += buffer.length;
    if (length > MAX_BODY_BYTES) {
      throw new Error('Request body is too large.');
    }
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    throw new Error('Request body is required.');
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

function parseRenderRequest(value: unknown): PreviewRenderRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Render request must be a JSON object.');
  }
  const body = value as Record<string, unknown>;
  if (typeof body.id !== 'string' || !body.id) {
    throw new Error('Render request requires a template id.');
  }
  if (body.variant !== undefined && typeof body.variant !== 'string') {
    throw new Error('Render variant must be a string.');
  }
  return {
    id: body.id,
    props: body.props as PreviewRenderRequest['props'],
    variant: body.variant,
  };
}

function safePath(root: string, requestPath: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return undefined;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) {
    return undefined;
  }
  const target = resolve(
    root,
    `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`,
  );
  const pathFromRoot = relative(root, target);
  if (
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    return undefined;
  }
  return target;
}

async function sendFile(
  request: IncomingMessage,
  response: ServerResponse,
  path: string,
  transform?: (contents: string) => string,
): Promise<boolean> {
  try {
    const metadata = await stat(path);
    if (!metadata.isFile()) {
      return false;
    }
    const contents = await readFile(path);
    const body = transform
      ? Buffer.from(transform(contents.toString('utf8')))
      : contents;
    setCommonHeaders(response);
    response.statusCode = 200;
    response.setHeader(
      'content-type',
      MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
    );
    response.setHeader('content-length', body.length);
    response.end(request.method === 'HEAD' ? undefined : body);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return false;
    }
    throw error;
  }
}

function serializeError(error: unknown, root: string): PreviewErrorResponse {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const hideRoot = (value: string): string =>
    value.split(root).join('<preview-root>');
  return {
    error: {
      message: hideRoot(normalized.message),
      ...(normalized.stack ? { stack: hideRoot(normalized.stack) } : {}),
    },
  };
}

function setUiSecurityHeaders(response: ServerResponse): void {
  response.setHeader(
    'content-security-policy',
    "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self' data:; frame-src 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  );
  response.setHeader('cross-origin-opener-policy', 'same-origin');
}

export function createPreviewHttpHandler(
  dependencies: PreviewHttpDependencies,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request, response) => {
    try {
      if (
        !isAllowedHost(
          request.headers.host,
          dependencies.config,
          dependencies.allowRemote,
        )
      ) {
        sendText(response, 400, 'Invalid Host header.');
        return;
      }

      const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
      const method = request.method ?? 'GET';

      if (url.pathname === '/api/health') {
        if (method !== 'GET') {
          response.setHeader('allow', 'GET');
          sendText(response, 405, 'Method not allowed.');
          return;
        }
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (url.pathname.startsWith('/api/')) {
        if (
          !secureTokenEquals(requestToken(request, url), dependencies.token)
        ) {
          sendJson(response, 401, {
            error: { message: 'Invalid preview token.' },
          });
          return;
        }

        if (url.pathname === '/api/events') {
          if (method !== 'GET') {
            response.setHeader('allow', 'GET');
            sendText(response, 405, 'Method not allowed.');
            return;
          }
          dependencies.events.connect(request, response);
          return;
        }

        if (url.pathname === '/api/templates') {
          if (method !== 'GET') {
            response.setHeader('allow', 'GET');
            sendText(response, 405, 'Method not allowed.');
            return;
          }
          const body: PreviewTemplatesResponse = {
            templates: dependencies.getRegistry().templates,
          };
          sendJson(response, 200, body);
          return;
        }

        if (url.pathname === '/api/render') {
          if (method !== 'POST') {
            response.setHeader('allow', 'POST');
            sendText(response, 405, 'Method not allowed.');
            return;
          }
          if (!isSameOriginRequest(request)) {
            sendJson(response, 403, {
              error: { message: 'Cross-origin request rejected.' },
            });
            return;
          }
          if (
            !request.headers['content-type']?.startsWith('application/json')
          ) {
            sendJson(response, 415, {
              error: { message: 'Expected application/json.' },
            });
            return;
          }
          let renderRequest: PreviewRenderRequest;
          try {
            renderRequest = parseRenderRequest(await readJsonBody(request));
          } catch (error) {
            sendJson(
              response,
              400,
              serializeError(error, dependencies.config.root),
            );
            return;
          }
          if (!dependencies.getRegistry().byId.has(renderRequest.id)) {
            sendJson(response, 404, {
              error: { message: 'Template was not found.' },
            });
            return;
          }
          try {
            sendJson(response, 200, await dependencies.render(renderRequest));
          } catch (error) {
            sendJson(
              response,
              422,
              serializeError(error, dependencies.config.root),
            );
          }
          return;
        }

        sendJson(response, 404, {
          error: { message: 'API route was not found.' },
        });
        return;
      }

      if (method !== 'GET' && method !== 'HEAD') {
        response.setHeader('allow', 'GET, HEAD');
        sendText(response, 405, 'Method not allowed.');
        return;
      }

      if (url.pathname.startsWith('/assets/')) {
        const assetPath = safePath(
          dependencies.config.assets,
          url.pathname.slice('/assets'.length),
        );
        if (assetPath && (await sendFile(request, response, assetPath))) {
          return;
        }
        sendText(response, 404, 'Asset was not found.');
        return;
      }

      setUiSecurityHeaders(response);
      if (url.pathname === '/' || url.pathname === '/__preview/') {
        const indexPath = resolve(dependencies.uiRoot, 'index.html');
        const sent = await sendFile(request, response, indexPath, (contents) =>
          contents.replaceAll(TOKEN_PLACEHOLDER, dependencies.token),
        );
        if (!sent) {
          sendText(
            response,
            503,
            'Preview UI assets are missing. Build @chakra-email/preview before starting it.',
          );
        }
        return;
      }
      if (url.pathname.startsWith('/__preview/')) {
        const uiPath = safePath(
          dependencies.uiRoot,
          url.pathname.slice('/__preview'.length),
        );
        if (uiPath && (await sendFile(request, response, uiPath))) {
          return;
        }
      }
      sendText(response, 404, 'Not found.');
    } catch (error) {
      sendJson(response, 500, serializeError(error, dependencies.config.root));
    }
  };
}

import type { IncomingMessage, ServerResponse } from 'node:http';

export type PreviewEvent = 'invalidate' | 'templates';

export class EventHub {
  readonly #clients = new Set<ServerResponse>();
  readonly #keepAlive: NodeJS.Timeout;

  constructor() {
    this.#keepAlive = setInterval(() => {
      for (const response of this.#clients) {
        response.write(': keep-alive\n\n');
      }
    }, 15_000);
    this.#keepAlive.unref();
  }

  connect(request: IncomingMessage, response: ServerResponse): void {
    if (this.#clients.size >= 20) {
      response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Too many preview event clients.');
      return;
    }
    response.writeHead(200, {
      'cache-control': 'no-cache, no-store',
      connection: 'keep-alive',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no',
    });
    response.write(': connected\n\n');
    this.#clients.add(response);
    request.once('close', () => {
      this.#clients.delete(response);
    });
  }

  broadcast(event: PreviewEvent): void {
    const message = `event: ${event}\ndata: ${JSON.stringify({ event })}\n\n`;
    for (const response of this.#clients) {
      response.write(message);
    }
  }

  close(): void {
    clearInterval(this.#keepAlive);
    for (const response of this.#clients) {
      response.end();
    }
    this.#clients.clear();
  }
}

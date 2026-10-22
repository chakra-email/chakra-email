import type { IncomingMessage, ServerResponse } from 'node:http';

export type PreviewEvent = 'invalidate' | 'templates' | 'lint-summary';

export class EventHub {
  readonly #clients = new Map<ServerResponse, () => void>();
  readonly #keepAlive: NodeJS.Timeout;
  #lastSummary: string | undefined;
  #closed = false;

  constructor() {
    this.#keepAlive = setInterval(() => {
      this.#write(': keep-alive\n\n');
    }, 15_000);
    this.#keepAlive.unref();
  }

  connect(request: IncomingMessage, response: ServerResponse): void {
    if (this.#closed || this.#clients.size >= 20) {
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
    const disconnect = (): void => {
      this.#clients.delete(response);
      request.off('close', disconnect);
      response.off('close', disconnect);
      response.off('error', disconnect);
    };
    this.#clients.set(response, disconnect);
    request.once('close', disconnect);
    response.once('close', disconnect);
    response.once('error', disconnect);
    this.#writeTo(response, ': connected\n\n');
    if (this.#lastSummary && this.#clients.has(response)) {
      this.#writeTo(response, this.#lastSummary);
    }
  }

  /** Keeps the existing bare-event contract while allowing JSON payloads. */
  publish(event: PreviewEvent, data: unknown = { event }): void {
    if (this.#closed) return;
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    if (event === 'lint-summary') this.#lastSummary = message;
    this.#write(message);
  }

  broadcast(event: PreviewEvent): void {
    this.publish(event);
  }

  #write(message: string): void {
    for (const response of this.#clients.keys()) {
      this.#writeTo(response, message);
    }
  }

  #writeTo(response: ServerResponse, message: string): void {
    try {
      // A large, healthy summary can legitimately cross Node's high-water mark.
      // Disconnect only when a slow consumer accumulates a substantial backlog.
      if (response.write(message) || response.writableLength <= 1024 * 1024) {
        return;
      }
    } catch {
      // One disconnected client must not interrupt delivery to other clients.
    }
    this.#clients.get(response)?.();
    response.destroy();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    clearInterval(this.#keepAlive);
    for (const [response, disconnect] of this.#clients) {
      disconnect();
      response.end();
    }
    this.#clients.clear();
    this.#lastSummary = undefined;
  }
}

import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { EventHub } from './event-hub.js';

function client() {
  const request = new EventEmitter();
  const response = Object.assign(new EventEmitter(), {
    writeHead: vi.fn(),
    write: vi.fn(() => true),
    writableLength: 0,
    end: vi.fn(),
    destroy: vi.fn(),
  });
  return {
    request,
    response,
    connect(hub: EventHub) {
      hub.connect(
        request as IncomingMessage,
        response as unknown as ServerResponse,
      );
    },
  };
}

describe('preview event hub', () => {
  const hubs: EventHub[] = [];
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    for (const hub of hubs.splice(0)) hub.close();
    vi.useRealTimers();
  });
  const createHub = () => {
    const hub = new EventHub();
    hubs.push(hub);
    return hub;
  };

  it('preserves bare events and publishes JSON data to connected clients', () => {
    const hub = createHub();
    const first = client();
    first.connect(hub);
    expect(first.response.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        'content-type': 'text/event-stream; charset=utf-8',
      }),
    );
    hub.broadcast('invalidate');
    expect(first.response.write).toHaveBeenLastCalledWith(
      'event: invalidate\ndata: {"event":"invalidate"}\n\n',
    );
    hub.publish('templates');
    expect(first.response.write).toHaveBeenLastCalledWith(
      'event: templates\ndata: {"event":"templates"}\n\n',
    );
    const data = {
      generation: 1,
      templates: [{ id: 'hello', error: 0, warning: 2, info: 1 }],
    };
    hub.publish('lint-summary', data);
    expect(first.response.write).toHaveBeenLastCalledWith(
      `event: lint-summary\ndata: ${JSON.stringify(data)}\n\n`,
    );
  });

  it('replays only the latest summary immediately after a late client connects', () => {
    const hub = createHub();
    const data = { generation: 2, templates: [] };
    hub.publish('lint-summary', { generation: 1, templates: [] });
    hub.publish('lint-summary', data);
    hub.publish('invalidate');
    const late = client();
    late.connect(hub);
    expect(late.response.write.mock.calls).toEqual([
      [': connected\n\n'],
      [`event: lint-summary\ndata: ${JSON.stringify(data)}\n\n`],
    ]);
    // Serialization happens on publish, not connect: caller mutation is harmless.
    data.generation = 99;
    const later = client();
    later.connect(hub);
    expect(later.response.write).toHaveBeenLastCalledWith(
      'event: lint-summary\ndata: {"generation":2,"templates":[]}\n\n',
    );
  });

  it('keeps alive connected clients and cleans up every listener on disconnect', () => {
    const hub = createHub();
    const first = client();
    first.connect(hub);
    vi.advanceTimersByTime(15_000);
    expect(first.response.write).toHaveBeenLastCalledWith(': keep-alive\n\n');
    first.request.emit('close');
    expect(first.request.listenerCount('close')).toBe(0);
    expect(first.response.listenerCount('close')).toBe(0);
    expect(first.response.listenerCount('error')).toBe(0);
    first.response.write.mockClear();
    hub.publish('templates');
    vi.advanceTimersByTime(15_000);
    expect(first.response.write).not.toHaveBeenCalled();
  });

  it('removes response errors, closed responses and slow or throwing consumers', () => {
    const hub = createHub();
    for (const event of ['error', 'close']) {
      const broken = client();
      broken.connect(hub);
      broken.response.emit(event, new Error('Disconnected'));
      broken.response.write.mockClear();
      hub.publish('invalidate');
      expect(broken.response.write).not.toHaveBeenCalled();
    }
    const slow = client();
    const throwing = client();
    const healthy = client();
    slow.connect(hub);
    throwing.connect(hub);
    healthy.connect(hub);
    slow.response.write.mockReturnValue(false);
    slow.response.writableLength = 1024 * 1024 + 1;
    throwing.response.write.mockImplementation(() => {
      throw new Error('Disconnected');
    });
    hub.publish('invalidate');
    expect(slow.response.destroy).toHaveBeenCalledOnce();
    expect(throwing.response.destroy).toHaveBeenCalledOnce();
    expect(healthy.response.write).toHaveBeenLastCalledWith(
      'event: invalidate\ndata: {"event":"invalidate"}\n\n',
    );
    hub.publish('templates');
    expect(slow.response.write).toHaveBeenCalledTimes(2);
    expect(throwing.response.write).toHaveBeenCalledTimes(2);
  });

  it('bounds clients and releases capacity after disconnect', () => {
    const hub = createHub();
    const connected = Array.from({ length: 20 }, () => client());
    for (const current of connected) current.connect(hub);
    const overflow = client();
    overflow.connect(hub);
    expect(overflow.response.writeHead).toHaveBeenCalledWith(
      503,
      expect.any(Object),
    );
    expect(overflow.response.end).toHaveBeenCalledWith(
      'Too many preview event clients.',
    );
    connected[0]?.request.emit('close');
    const replacement = client();
    replacement.connect(hub);
    expect(replacement.response.writeHead).toHaveBeenCalledWith(
      200,
      expect.any(Object),
    );
  });

  it('allows a healthy large summary to cross the write high-water mark', () => {
    const hub = createHub();
    const current = client();
    current.connect(hub);
    current.response.write.mockReturnValue(false);
    current.response.writableLength = 32 * 1024;
    hub.publish('lint-summary', { generation: 1, templates: [] });
    expect(current.response.destroy).not.toHaveBeenCalled();
    hub.publish('invalidate');
    expect(current.response.write).toHaveBeenCalledTimes(3);
  });

  it('closes clients, timers and replay state idempotently', () => {
    const hub = createHub();
    const current = client();
    current.connect(hub);
    hub.publish('lint-summary', { generation: 1, templates: [] });
    hub.close();
    hub.close();
    expect(current.response.end).toHaveBeenCalledOnce();
    expect(current.request.listenerCount('close')).toBe(0);
    expect(current.response.listenerCount('error')).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    current.response.write.mockClear();
    hub.publish('invalidate');
    expect(current.response.write).not.toHaveBeenCalled();
    const late = client();
    late.connect(hub);
    expect(late.response.writeHead).toHaveBeenCalledWith(
      503,
      expect.any(Object),
    );
    expect(late.response.write).not.toHaveBeenCalled();
  });
});

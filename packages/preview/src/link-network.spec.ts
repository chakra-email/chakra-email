import { EventEmitter } from 'node:events';
import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isPublicIpv4, requestLinkHead } from './link-network.js';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:http', () => ({ request: vi.fn() }));
vi.mock('node:https', () => ({ request: vi.fn() }));

describe('link-check network boundary', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it.each([
    '0.0.0.0',
    '10.1.1.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.0.1',
    '100.100.100.200',
    '192.0.2.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
  ])('blocks reserved address %s', (address) => {
    expect(isPublicIpv4(address)).toBe(false);
  });
  it('recognizes public IPv4', () =>
    expect(isPublicIpv4('93.184.216.34')).toBe(true));

  it('rejects private literals including normalized alternative IP notation before HTTP', async () => {
    for (const host of [
      '127.1',
      '0x7f000001',
      '2130706433',
      '[::1]',
      '[::ffff:127.0.0.1]',
    ]) {
      await expect(
        requestLinkHead(new URL(`http://${host}`), 100),
      ).rejects.toThrow();
    }
    expect(httpRequest).not.toHaveBeenCalled();
  });

  function mockRequest() {
    const request = Object.assign(new EventEmitter(), {
      end: vi.fn(),
      destroy: vi.fn((error?: Error) => {
        if (error) request.emit('error', error);
        return request;
      }),
    });
    vi.mocked(httpsRequest).mockReturnValue(
      request as unknown as ReturnType<typeof httpsRequest>,
    );
    return request;
  }

  it('pins validated DNS to the socket and uses HEAD without following Location', async () => {
    const request = mockRequest();
    vi.mocked(lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);
    const pending = requestLinkHead(new URL('https://example.org/page'), 1000);
    const options = vi.mocked(httpsRequest).mock
      .calls[0][1] as import('node:https').RequestOptions;
    expect(options).toMatchObject({
      method: 'HEAD',
      agent: false,
      family: 4,
      maxHeaderSize: 16384,
    });
    const callback = vi.fn();
    options.lookup?.('example.org', {}, callback);
    await vi.waitFor(() =>
      expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4),
    );
    request.emit('response', {
      statusCode: 308,
      headers: { location: 'http://127.0.0.1/' },
      destroy: vi.fn(),
    });
    await expect(pending).resolves.toEqual({
      status: 308,
      location: 'http://127.0.0.1/',
    });
    expect(httpsRequest).toHaveBeenCalledTimes(1);
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('rejects mixed public/private DNS answers and DNS failures', async () => {
    const request = mockRequest();
    const pending = requestLinkHead(new URL('https://example.org/'), 1000);
    const options = vi.mocked(httpsRequest).mock
      .calls[0][1] as import('node:https').RequestOptions;
    const callback = vi.fn();
    vi.mocked(lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    options.lookup?.('example.org', {}, callback);
    await vi.waitFor(() =>
      expect(callback).toHaveBeenCalledWith(expect.any(Error), '', 4),
    );
    callback.mockClear();
    vi.mocked(lookup).mockRejectedValue(new Error('dns failed'));
    options.lookup?.('example.org', {}, callback);
    await vi.waitFor(() =>
      expect(callback).toHaveBeenCalledWith(expect.any(Error), '', 4),
    );
    request.emit('error', new Error('blocked'));
    await expect(pending).rejects.toThrow('blocked');
  });

  it('enforces a wall-clock timeout even without response or DNS completion', async () => {
    vi.useFakeTimers();
    const request = mockRequest();
    const pending = requestLinkHead(new URL('https://example.org/'), 100);
    const assertion = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(request.destroy).toHaveBeenCalled();
  });
});

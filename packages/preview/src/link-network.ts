import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(address, prefix);

export function isPublicIpv4(address: string): boolean {
  return isIP(address) === 4 && !blocked.check(address);
}

export interface LinkHeadResponse {
  status: number;
  location?: string;
}

/** HEAD only; no cookies, proxy, redirects, response body, or GET fallback. */
export function requestLinkHead(
  url: URL,
  timeoutMs: number,
): Promise<LinkHeadResponse> {
  return new Promise((resolve, reject) => {
    const literal = url.hostname.replace(/^\[|\]$/gu, '');
    if (isIP(literal) && !isPublicIpv4(literal)) {
      reject(new Error('Destination is not public IPv4.'));
      return;
    }
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      {
        method: 'HEAD',
        agent: false,
        family: 4,
        maxHeaderSize: 16 * 1024,
        headers: { 'user-agent': 'ChakraEmail-LinkCheck/1.0', accept: '*/*' },
        // Resolve once and pin the approved address to the socket. Never validate
        // DNS and then allow the HTTP client to independently resolve it again.
        lookup: (hostname, _options, callback) => {
          void lookup(hostname, { all: true, family: 4 }).then(
            (addresses) => {
              if (
                !addresses.length ||
                addresses.some(({ address }) => !isPublicIpv4(address))
              ) {
                callback(new Error('Destination is not public IPv4.'), '', 4);
                return;
              }
              callback(null, addresses[0].address, 4);
            },
            () => callback(new Error('DNS lookup failed.'), '', 4),
          );
        },
      },
    );
    // A wall-clock deadline includes DNS, TLS and response headers.
    const timer = setTimeout(
      () => request.destroy(new Error('Link check timed out.')),
      timeoutMs,
    );
    request.once('response', (response) => {
      clearTimeout(timer);
      resolve({
        status: response.statusCode ?? 0,
        location: response.headers.location,
      });
      response.destroy();
      request.destroy();
    });
    request.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    request.end();
  });
}

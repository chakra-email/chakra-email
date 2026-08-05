import { describe, expect, it } from 'vitest';
import { sanitizeImageSrc } from './Img';

describe('sanitizeImageSrc', () => {
  it.each([
    'https://example.com/logo.png',
    'http://example.com/logo.png',
    'cid:logo@example.com',
  ])('preserves portable image sources: %s', (src) => {
    expect(sanitizeImageSrc(src)).toBe(src);
  });

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'file:///tmp/logo.png',
    'ftp://example.com/logo.png',
    '/logo.png',
    '//example.com/logo.png',
    'logo.png',
    'https:',
    'https:/example.com/logo.png',
    'https://',
    'h t t p s://example.com/logo.png',
    'cid:',
    'cid:logo image@example.com',
    '',
  ])('rejects unsupported, relative, or malformed sources: %s', (src) => {
    expect(sanitizeImageSrc(src)).toBeUndefined();
  });

  it('preserves an allowed source byte-for-byte after validation', () => {
    const src = ' \nHTTPS://example.com/logo image.png';

    expect(sanitizeImageSrc(src)).toBe(src);
  });
});

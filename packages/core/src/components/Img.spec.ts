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
    'https://user:password@example.com/logo.png',
    'https://example.com/logo.png#fragment',
    ' https://example.com/logo.png',
    'https://example.com/logo.png ',
    'https://example.com/%ZZ',
    '',
  ])('rejects unsupported, relative, or malformed sources: %s', (src) => {
    expect(sanitizeImageSrc(src)).toBeUndefined();
  });

  it('enforces byte limits and supports explicit policy overrides', () => {
    const credentialed = 'https://user:password@example.com/logo.png';

    expect(
      sanitizeImageSrc(`https://example.com/${'a'.repeat(2_100)}.png`),
    ).toBeUndefined();
    expect(sanitizeImageSrc(credentialed, { allowCredentials: true })).toBe(
      credentialed,
    );
    expect(
      sanitizeImageSrc('https://example.com/logo.svg#mark', {
        allowFragments: true,
      }),
    ).toBe('https://example.com/logo.svg#mark');
  });
});

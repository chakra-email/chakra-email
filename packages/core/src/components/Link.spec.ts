import { describe, expect, it } from 'vitest';
import { sanitizeHref } from './Link';

describe('sanitizeHref', () => {
  it.each([
    'https://example.com/docs',
    'http://example.com',
    'mailto:hello@example.com',
    'tel:+15555550123',
    '#section',
  ])('preserves supported absolute hrefs and fragments: %s', (href) => {
    expect(sanitizeHref(href)).toBe(href);
  });

  it.each([
    'javascript:alert(1)',
    '\n JaVaScRiPt:alert(1)',
    'vbscript:MsgBox(1)',
    'data:text/html,payload',
    'data:image/png;base64,AAAA',
    'data:image/svg+xml,<svg onload="alert(1)"/>',
    'file:///etc/passwd',
    'ftp://example.com/file',
    'blob:https://example.com/id',
    'https:',
    'https:/example.com',
    'https://',
    'h t t p s://example.com',
    'mailto:',
    'tel:',
    '',
    '/relative/path',
    './relative/path',
    '../relative/path',
    '?page=2',
    'relative/path',
    '//example.com/protocol-relative',
  ])('rejects unsupported or non-portable hrefs: %s', (href) => {
    expect(sanitizeHref(href)).toBeUndefined();
  });

  it('preserves an allowed URL byte-for-byte after validation', () => {
    const href = ' \nHTTPS://example.com/path?q=hello world';

    expect(sanitizeHref(href)).toBe(href);
  });
});

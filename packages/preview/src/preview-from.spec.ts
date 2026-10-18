import { parsePreviewFrom } from './preview-from.js';

describe('parsePreviewFrom', () => {
  it.each([
    ['hello@example.org', { address: 'hello@example.org' }],
    [
      ' Forward <hello@forward.domains> ',
      { address: 'hello@forward.domains', name: 'Forward' },
    ],
    [
      '"Équipe" <hello@example.org>',
      { address: 'hello@example.org', name: 'Équipe' },
    ],
  ])('normalizes %s', (input, expected) => {
    expect(parsePreviewFrom(input)).toEqual(expected);
  });

  it.each([
    '',
    'no-address',
    'a@example.org,b@example.org',
    '<a@example.org>',
    'a@éxample.org',
    'A\r\nBcc: hidden@example.org',
    'a@example.org\n',
    'Name\u0001 <a@example.org>',
    'a@bad..example',
    '.a@example.org',
    'a.@example.org',
    'a@-bad.example',
    42,
    null,
  ])('rejects unsafe or invalid sender %#', (input) => {
    expect(() => parsePreviewFrom(input)).toThrow('previewFrom');
  });
});

import { buildPreviewMessage } from './message';

describe('preview message export', () => {
  it('includes both unmodified output parts, envelope headers, and CRLF line endings', () => {
    const message = buildPreviewMessage(
      {
        html: '<p>Hello = world</p>',
        text: 'Hello world',
        subject: 'Hello',
        to: 'ada@example.com',
      },
      new Date('2026-10-18T12:00:00Z'),
      'test-boundary',
    );
    expect(message).toContain('From: preview@localhost\r\nTo: ada@example.com');
    expect(message).toContain('Date: Sun, 18 Oct 2026 12:00:00 GMT');
    expect(message).toContain('Content-Type: text/plain; charset=UTF-8');
    expect(message).toContain('Content-Type: text/html; charset=UTF-8');
    expect(message).toContain('<p>Hello=20=3D=20world</p>');
    expect(message).toContain('--test-boundary--\r\n');
    expect(message.replaceAll('\r\n', '')).not.toContain('\n');
  });
  it('encodes Unicode subjects and bodies, folds long encoded lines, and supplies a default recipient', () => {
    const message = buildPreviewMessage({
      html: '<p>👋</p>',
      text: 'café '.repeat(30),
      subject: '👋 Welcome '.repeat(20),
    });
    expect(message).toContain('To: preview@localhost');
    expect(message).toContain('Subject: =?UTF-8?B?');
    expect(message).toContain('=F0=9F=91=8B');
    expect(message.split('\r\n').every((line) => line.length <= 76)).toBe(true);
    const encoded = message.match(/Subject: ([\s\S]*?)\r\nDate:/u)?.[1] ?? '';
    const decoded = [...encoded.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/gu)]
      .map((match) =>
        new TextDecoder().decode(
          Uint8Array.from(atob(match[1]), (character) =>
            character.charCodeAt(0),
          ),
        ),
      )
      .join('');
    expect(decoded).toBe('👋 Welcome '.repeat(20));
  });
  it('rejects header injection', () => {
    expect(() =>
      buildPreviewMessage({
        html: '',
        text: '',
        subject: 'Hello\r\nBcc: victim@example.com',
      }),
    ).toThrow('line breaks');
    expect(() =>
      buildPreviewMessage({
        html: '',
        text: '',
        subject: 'Hello',
        to: 'a@example.com\nBcc: b@example.com',
      }),
    ).toThrow('line breaks');
  });
});

import { buildPreviewMessage } from './message';

describe('preview message export', () => {
  it('generates a safe MIME boundary without requiring secure-context randomUUID', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(10),
    });
    try {
      const output = buildPreviewMessage({
        html: '',
        text: '',
        subject: 'Hello',
      });
      expect(output).toContain(`boundary="chakra-email-${'0a'.repeat(16)}"`);
    } finally {
      vi.unstubAllGlobals();
    }
  });
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

  it('exports bare and named senders, safely quoting display names', () => {
    const message = { html: '<p>Hello</p>', text: 'Hello', subject: 'Hello' };
    expect(
      buildPreviewMessage({
        ...message,
        from: { address: 'hello@forward.domains' },
      }),
    ).toContain('From: hello@forward.domains\r\n');
    expect(
      buildPreviewMessage({
        ...message,
        from: { address: 'hello@forward.domains', name: 'Forward "Support"' },
      }),
    ).toContain(
      'From: "Forward \\"Support\\""\r\n <hello@forward.domains>\r\n',
    );
  });

  it('encodes a non-ASCII sender name without changing its mailbox', () => {
    const output = buildPreviewMessage({
      html: '',
      text: '',
      subject: 'Hello',
      from: { name: 'Communauté 👋', address: 'hello@example.com' },
    });
    const from = output.match(/From: ([\s\S]*?)\r\nTo:/u)?.[1] ?? '';
    const encoded = from.match(/=\?UTF-8\?B\?([^?]+)\?=/u)?.[1] ?? '';
    expect(
      new TextDecoder().decode(
        Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)),
      ),
    ).toBe('Communauté 👋');
    expect(from).toContain('<hello@example.com>');
  });

  it.each([
    { address: 'hello@example.com\r\nBcc: victim@example.com' },
    { address: 'hello@example.com', name: 'Forward\nBcc: victim@example.com' },
    { address: 'hello@example.com', name: 'Forward\u0000' },
    { address: 'a@example.com>, b@example.com' },
  ])('rejects invalid sender headers: %j', (from) => {
    expect(() =>
      buildPreviewMessage({ html: '', text: '', subject: 'Hello', from }),
    ).toThrow();
  });
});

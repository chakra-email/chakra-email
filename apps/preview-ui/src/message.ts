/** A local MIME export for opening in a mail client; this never sends mail. */
export function buildPreviewMessage(
  message: {
    html: string;
    text: string;
    subject: string;
    to?: string;
    from?: { address: string; name?: string };
  },
  date = new Date(),
  boundary = `chakra-email-${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
): string {
  const to = message.to || 'preview@localhost';
  if (/[\r\n]/u.test(to) || /[\r\n]/u.test(message.subject)) {
    throw new Error('Email headers must not contain line breaks.');
  }
  const encodeHeader = (value: string): string => {
    const chunks: string[] = [];
    let chunk = '';
    const encode = (text: string) =>
      `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(text)))}?=`;
    for (const character of value) {
      if (new TextEncoder().encode(chunk + character).length > 42) {
        chunks.push(encode(chunk));
        chunk = '';
      }
      chunk += character;
    }
    if (chunk) chunks.push(encode(chunk));
    return chunks.join('\r\n ');
  };
  let from = 'preview@localhost';
  if (message.from) {
    const { address, name } = message.from;
    if (/[\r\n]/u.test(address) || /[\r\n]/u.test(name ?? '')) {
      throw new Error('Email headers must not contain line breaks.');
    }
    if (
      !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/u.test(address) ||
      [...(name ?? '')].some(
        (character) =>
          (character.codePointAt(0) ?? 0) < 32 ||
          character.codePointAt(0) === 127,
      )
    ) {
      throw new Error('The preview sender must contain a valid mailbox.');
    }
    const displayName = name
      ? /^[\x20-\x7e]*$/u.test(name) && name.length <= 50
        ? '"' + name.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'
        : encodeHeader(name)
      : '';
    from = displayName ? `${displayName}\r\n <${address}>` : address;
  }
  const quotedPrintable = (value: string) =>
    value
      .replace(/\r\n/gu, '\n')
      .split('\n')
      .map((line) => {
        let encoded = '';
        let column = 0;
        for (const byte of new TextEncoder().encode(line)) {
          const token =
            byte >= 33 && byte <= 126 && byte !== 61
              ? String.fromCharCode(byte)
              : '=' + byte.toString(16).toUpperCase().padStart(2, '0');
          if (column + token.length > 73) {
            encoded += '=\r\n';
            column = 0;
          }
          encoded += token;
          column += token.length;
        }
        return encoded;
      })
      .join('\r\n');
  const part = (type: string, body: string) =>
    `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${quotedPrintable(body)}\r\n`;
  return (
    [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodeHeader(message.subject)}`,
      `Date: ${date.toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative;',
      ` boundary="${boundary}"`,
      '',
      '',
    ].join('\r\n') +
    part('text/plain', message.text) +
    part('text/html', message.html) +
    `--${boundary}--\r\n`
  );
}

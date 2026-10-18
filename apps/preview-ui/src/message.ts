/** A local MIME export for opening in a mail client; this never sends mail. */
export function buildPreviewMessage(
  message: { html: string; text: string; subject: string; to?: string },
  date = new Date(),
  boundary = `chakra-email-${crypto.randomUUID()}`,
): string {
  const to = message.to || 'preview@localhost';
  if (/[\r\n]/u.test(to) || /[\r\n]/u.test(message.subject)) {
    throw new Error('Email headers must not contain line breaks.');
  }
  const subjectChunks: string[] = [];
  let chunk = '';
  const encodeSubject = (value: string) =>
    `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(value)))}?=`;
  for (const character of message.subject) {
    if (new TextEncoder().encode(chunk + character).length > 42) {
      subjectChunks.push(encodeSubject(chunk));
      chunk = '';
    }
    chunk += character;
  }
  if (chunk) subjectChunks.push(encodeSubject(chunk));
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
      'From: preview@localhost',
      `To: ${to}`,
      `Subject: ${subjectChunks.join('\r\n ')}`,
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

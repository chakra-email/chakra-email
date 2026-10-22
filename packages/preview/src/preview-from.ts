export interface PreviewSender {
  address: string;
  name?: string;
}

/** Parse one preview mailbox, never a recipient list or injected header. */
export function parsePreviewFrom(value: unknown): PreviewSender {
  const invalid = () =>
    new Error('previewFrom must be a valid sender address or Name <address>.');
  if (typeof value !== 'string' || /[\r\n]/u.test(value)) throw invalid();
  const input = value.trim();
  const named = /^([^<>]+)\s*<([^<>]+)>$/u.exec(input);
  const address = (named?.[2] ?? input).trim();
  const [localPart = '', domain = ''] = address.split('@');
  if (
    address.length > 254 ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/u.test(
      address,
    ) ||
    address.includes('..') ||
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    domain
      .split('.')
      .some(
        (label) =>
          label.length > 63 || label.startsWith('-') || label.endsWith('-'),
      )
  )
    throw invalid();
  if (!named) return { address };
  const rawName = named[1]?.trim() ?? '';
  const name =
    rawName.startsWith('"') && rawName.endsWith('"')
      ? rawName.slice(1, -1)
      : rawName;
  if (
    !name ||
    /["\\<>]/u.test(name) ||
    [...name].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 0x1f || code === 0x7f;
    })
  )
    throw invalid();
  return { address, name };
}

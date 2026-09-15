import { PreviewApplication } from './app';

function readTheme(): Record<string, unknown> {
  const encoded = document
    .querySelector<HTMLMetaElement>('meta[name="chakra-email-preview-theme"]')
    ?.getAttribute('content');

  if (!encoded || encoded.startsWith('__CHAKRA_EMAIL_')) {
    return {};
  }

  try {
    const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (character) =>
      character.charCodeAt(0),
    );
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    throw new Error('The preview application could not read its theme data.');
  }
}

const root = document.querySelector<HTMLElement>('#app');
const token = document
  .querySelector<HTMLMetaElement>('meta[name="chakra-email-preview-token"]')
  ?.getAttribute('content');

if (!root || !token) {
  throw new Error('The preview application could not read its bootstrap data.');
}

const application = new PreviewApplication({ root, theme: readTheme(), token });
void application.start();

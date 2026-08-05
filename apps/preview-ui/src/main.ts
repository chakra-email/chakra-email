import { PreviewApplication } from './app';

const root = document.querySelector<HTMLElement>('#app');
const token = document
  .querySelector<HTMLMetaElement>('meta[name="chakra-email-preview-token"]')
  ?.getAttribute('content');

if (!root || !token) {
  throw new Error('The preview application could not read its bootstrap data.');
}

const application = new PreviewApplication({ root, token });
void application.start();

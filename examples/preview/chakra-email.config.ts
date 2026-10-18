import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  root: '.',
  previewFrom: 'Northstar <hello@example.com>',
  allowedHosts: ['preview.chakra-email.test'],
  templates: './emails',
  assets: './public',
  include: ['**/*.email.{ts,tsx}'],
  exclude: ['**/*.{test,spec}.{ts,tsx}'],
});

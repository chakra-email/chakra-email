import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  root: '.',
  templates: './emails',
  assets: './public',
  include: ['**/*.email.{ts,tsx}'],
  exclude: ['**/*.{test,spec}.{ts,tsx}'],
});

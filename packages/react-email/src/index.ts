import type { EmailRenderer } from '@chakra-email/core';
import { pretty, render, toPlainText } from 'react-email';

/**
 * Uses React Email's renderer while keeping Chakra Email preview and export
 * tooling independent from React Email itself.
 */
export function reactEmailRenderer(): EmailRenderer {
  return {
    async render(element, options = {}) {
      const rendered = await render(element);
      const [html, text] = await Promise.all([
        options.pretty ? pretty(rendered) : rendered,
        Promise.resolve(toPlainText(rendered, options.plainTextOptions)),
      ]);

      return { html, text };
    },
  };
}

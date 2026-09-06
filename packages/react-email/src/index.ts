import {
  stripBrowserOnlyEmailHints,
  createEmailColorModeRender,
  type EmailRenderer,
} from '@chakra-email/core/render';
import {
  assertEmailOutputLimits,
  EmailSecurityPolicyProvider,
} from '@chakra-email/core/security';
import { createElement } from 'react';
import { pretty, render, toPlainText } from 'react-email';

/**
 * Uses React Email's renderer while keeping Chakra Email preview and export
 * tooling independent from React Email itself.
 */
export function reactEmailRenderer(): EmailRenderer {
  return {
    async render(element, options = {}) {
      const renderable = options.urlPolicy
        ? createElement(EmailSecurityPolicyProvider, {
            policy: options.urlPolicy,
            children: element,
          })
        : element;
      const modeRender = createEmailColorModeRender(
        renderable,
        options.colorMode,
      );
      const rendered = modeRender.finish(
        stripBrowserOnlyEmailHints(await render(modeRender.element)),
      );
      const [html, text] = await Promise.all([
        options.pretty ? pretty(rendered) : rendered,
        Promise.resolve(toPlainText(rendered, options.plainTextOptions)),
      ]);

      const output = { html, text };
      assertEmailOutputLimits(output, options.outputLimits);
      return output;
    },
  };
}

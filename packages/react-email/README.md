# @chakra-email/react-email

Optional React Email renderer integration for Chakra Email tooling.

[Documentation](https://chakra.email/docs/rendering#renderer-adapters) · [Getting started](https://chakra.email/docs/getting-started) · [Examples](https://chakra.email/examples) · [Issues](https://github.com/chakra-email/chakra-email/issues)

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Use this adapter when you want React Email's renderer in Chakra Email preview
or export tooling. Ordinary Chakra Email rendering does not need it.

## Install

```bash
npm install @chakra-email/react-email react-email react react-dom
```

The integration is optional, but `react-email` is a required peer dependency
when using this adapter. It is not installed by `@chakra-email/core` or
`@chakra-email/preview`.

> [!NOTE]
> ESM-only. Published packages support React 18/19 and Node.js 20.19.0 or newer;
> Node.js 24 is recommended. This repository's contributor tooling uses Node.js
> 24 and pnpm.

## Quick start

The adapter returns HTML and plain text through the shared `EmailRenderer`
interface. This example uses React's built-in elements and needs no component
library:

<!-- quickstart:start -->

```tsx
import { reactEmailRenderer } from '@chakra-email/react-email';

export async function renderWelcomeEmail() {
  return reactEmailRenderer().render(
    <html lang="en">
      <head>
        <title>Welcome, Ada</title>
      </head>
      <body>
        <h1>Welcome, Ada</h1>
        <p>Your workspace is ready.</p>
      </body>
    </html>,
  );
}
```

<!-- quickstart:end -->

Call `await renderWelcomeEmail()` to receive `{ html, text }` for your delivery
provider. Rendering does not send mail or require provider credentials.

## Preview React Email templates

Install the local preview tool as a development dependency:

```bash
npm install --save-dev @chakra-email/preview
```

Create `chakra-email.config.ts` in your email project:

```ts
import { reactEmailRenderer } from '@chakra-email/react-email';
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  templates: './src/emails',
  renderer: reactEmailRenderer(),
});
```

Add a default-exported component in `src/emails/welcome.email.tsx`, then run
`npx chakra-email-preview --config chakra-email.config.ts` and open
`http://127.0.0.1:4100`. See the [preview guide](https://chakra.email/docs/preview)
for fixture props, variants, and an npm script.

The adapter can render templates composed from React Email components, Chakra
Email components, or both. Install any component packages your templates import
separately.

## Rendering behavior

Renderer-wide Chakra Email `urlPolicy`, `outputLimits`, and `colorMode` options are forwarded
by the adapter. React 19's browser-oriented image preload hints are removed
before adapter output is returned.

Chakra Email components retain their semantic light/dark colors through this
adapter: system mode collects dark CSS alongside light inline styles in one
React render. React Email components retain their own authored styles; they are
not automatically converted to Chakra Email tokens or dark-mode rules.

This adapter does not convert browser-oriented CSS or arbitrary React UI into
email-compatible markup. Test the output in your supported mail clients.

## Help and contributing

Read the [rendering guide](https://chakra.email/docs/rendering#renderer-adapters), [open an issue](https://github.com/chakra-email/chakra-email/issues), or see the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## License

MIT

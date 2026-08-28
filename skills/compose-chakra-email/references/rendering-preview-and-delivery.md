# Rendering, preview, and delivery

## Render one coherent output

Prefer `renderEmail` when a provider accepts both HTML and plain text:

```tsx
import { renderEmail } from 'chakra-email';

const { html, text } = await renderEmail(<AccountEmail {...props} />, {
  pretty: process.env.NODE_ENV !== 'production',
});
```

It derives both bodies from one React render so dynamic values cannot drift.
Use `render` for HTML-only output and `renderPlainText` when plain text must be
generated separately. Plain-text conversion accepts `html-to-text` options.
Add `data-skip-in-text="true"` only to content that should deliberately remain
HTML-only.

Delivery providers own envelopes and transport concerns. Keep sender identity,
recipients, attachments, provider tags, tracking, idempotency, retries, and
credentials outside the template component.

## Add optional content adapters deliberately

Use `@chakra-email/markdown` when a ready-made GFM mapping is useful. Use
`@chakra-email/code-block` for fenced code and supply a synchronous Prism,
Shiki, or custom highlighter only when syntax highlighting is needed. Keep raw
HTML disabled unless the content pipeline sanitizes it before rendering.

Use `@chakra-email/react-email` when preview or export tooling must follow React
Email rendering behavior:

```ts
import { reactEmailRenderer } from '@chakra-email/react-email';
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  renderer: reactEmailRenderer(),
});
```

The adapter supports React Email components, Chakra Email components, or a mix.
React Email remains an optional peer dependency.

## Configure local preview

Install `@chakra-email/preview` as a development dependency and keep discovery
paths relative to the owning project:

```ts
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  root: '.',
  templates: './src/emails',
  include: ['**/*.email.{ts,tsx}'],
  assets: './public',
  host: '127.0.0.1',
  port: 4100,
});
```

Templates default-export their component. Export serializable `previewProps`
for the base case and `previewVariants` containing only scenario-specific
overrides. Component-level `PreviewProps` is a React Email compatibility
fallback; a named `previewProps` export takes precedence.

The preview UI theme is a JSON-serializable Chakra fragment. Override its
exported `previewSlotRecipeKeys` rather than relying on internal class names.
Functions, renderers, and test-send transports remain server-only.

The local server executes template modules with the process's filesystem,
environment, and network authority. Keep it loopback-only by default, do not
load untrusted repositories, and never put production secrets or real customer
data into preview props.

## Export and test

Use the CLI for local development and deterministic artifacts:

```bash
chakra-email-preview --config chakra-email.config.ts
chakra-email-preview export --config chakra-email.config.ts --out-dir dist/emails
```

The exporter can include named variants and produce HTML, text, or both. The
browser workspace can download its active output. Preview lint findings include
advisory accessibility, markup, deliverability, and compatibility checks; they
do not replace mailbox-client testing.

An optional `testSend` transport can expose test delivery in the local UI:

```ts
export default defineConfig({
  testSend: {
    async send({ html, subject, text, to }) {
      const result = await developmentMailer.send({ html, subject, text, to });
      return { id: result.id };
    },
  },
});
```

Keep the provider SDK and credentials in the consuming project. Use a dedicated
development sender and recipient allow-list when possible. Configuring the
transport does not itself authorize an agent to send a message; perform that
external side effect only when the user explicitly requests it.

## Validate before production

Render and inspect fixtures for long content, missing optional data, multiple
columns, Markdown tables, remote and CID images, preview text, and CTA links.
Send representative messages through the production delivery path and record
results for the mailbox-client versions the application supports. A browser
preview or clean HTML snapshot is not proof of inbox placement or client
compatibility.

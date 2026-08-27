# @chakra-email/preview

[![npm](https://img.shields.io/npm/v/%40chakra-email%2Fpreview?style=flat-square)](https://www.pkgstats.com/pkg:@chakra-email/preview)
[![NPM](https://img.shields.io/npm/l/%40chakra-email%2Fpreview?style=flat-square)](https://github.com/chakra-email/chakra-email/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/dt/%40chakra-email%2Fpreview?style=flat-square)](https://www.pkgstats.com/pkg:@chakra-email/preview)

Local React email preview server with live rendering, template variants, and email linting.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

`@chakra-email/preview` discovers template modules in your repository, renders
their default exports, and lets you exercise representative props without
adding preview code to your production application. Version `0.1.0` provides
the `chakra-email-preview` CLI and a programmatic server API.

## Install

Install the preview package as a development dependency in the repository that
contains your emails:

```bash
npm install --save-dev @chakra-email/preview
```

> [!NOTE]
> `@chakra-email/preview` is ESM-only. Node.js 20.19.0 is the compatibility floor; Node.js 22 or 24 is recommended for new development environments.

Your email library should also install its normal rendering package and React
peer dependencies, for example:

```bash
npm install chakra-email react react-dom
```

## Configure

Create `chakra-email.config.ts` next to the email project or package:

```ts
import { defineConfig, previewSlotRecipeKeys } from '@chakra-email/preview';

export default defineConfig({
  root: '.',
  templates: './src/emails',
  include: ['**/*.email.{ts,tsx}'],
  exclude: ['**/*.{test,spec}.{ts,tsx}', '**/__fixtures__/**'],
  assets: './public',
  host: '127.0.0.1',
  port: 4100,
  theme: {
    semanticTokens: {
      colors: {
        preview: {
          accent: { value: { _light: '#171717', _dark: '#fafafa' } },
          accentInk: { value: { _light: '#ffffff', _dark: '#171717' } },
        },
      },
    },
    slotRecipes: {
      [previewSlotRecipeKeys.workspace]: {
        base: {
          header: { bg: 'preview.panel' },
          sidebar: { bg: 'preview.canvas' },
        },
      },
    },
  },
});
```

The default renderer is `chakraEmailRenderer` from `@chakra-email/core`. To
preview templates that rely on React Email rendering behavior, install the
optional adapter and configure it server-side:

```ts
import { reactEmailRenderer } from '@chakra-email/react-email';
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  renderer: reactEmailRenderer(),
});
```

`root` is resolved relative to the directory containing the configuration
file. `templates` and `assets` are resolved relative to `root`; `include` and
`exclude` patterns are evaluated inside each templates directory. When neither
`templates` nor `include` is configured, templates are discovered under
`./emails`.

- `root` sets the base directory for discovery and static assets.
- `templates` selects the template directory.
- `include` adds the template-module glob patterns to discover.
- `exclude` removes matching modules from discovery.
- `assets` selects the static asset directory used by the preview server.
- `host` defaults to the loopback-only address `127.0.0.1`.
- `port` defaults to `4100`.
- `theme` accepts a JSON-serializable Chakra theme fragment for the preview UI,
  including `tokens`, `semanticTokens`, `recipes`, and `slotRecipes`.
- `renderer` accepts an `EmailRenderer` implementation and remains on the
  preview server; functions are never serialized into the browser UI.
- `testSend` accepts a server-only delivery adapter. When configured, the
  inspector exposes recipient and subject fields for sending the active render.

The theme is serialized by the local preview server and merged over the
preview UI defaults in the browser. Keep it data-only: functions and a
pre-created Chakra `SystemContext` cannot cross that boundary.

The neutral default system uses `preview.*` semantic color tokens and these
exported slot recipe keys:

- `workspace`: the application shell, header, sidebar, toolbar, and content.
- `templates`: template list, item, avatar, text, and selected-state slots.
- `viewer`: format tabs, preview surface, email frame, and source viewer.
- `inspector`: props editor, controls, notice, and lint result slots.
- `feedback`: error banner and tooltip slots.

Each recipe supports partial overrides, so omitted defaults remain intact. Use
the exported `previewSlotRecipeKeys` values as computed keys to keep theme
configuration resilient to future package changes.

A missing `assets` directory does not prevent the server from starting; requests
for files that are not present return `404`.

## Template Modules

A template module must default-export the React email component:

```tsx
import { Body, Html, Text } from 'chakra-email';

export type WelcomeEmailProps = {
  firstName: string;
  plan: 'free' | 'pro';
};

export const previewProps: WelcomeEmailProps = {
  firstName: 'Ada',
  plan: 'free',
};

export const previewVariants = {
  'Pro account': {
    plan: 'pro',
  },
  'Long name': {
    firstName: 'Alexandria Catherine',
  },
} satisfies Record<string, Partial<WelcomeEmailProps>>;

export default function WelcomeEmail({ firstName, plan }: WelcomeEmailProps) {
  return (
    <Html>
      <Body>
        <Text>
          Welcome, {firstName}. Your {plan} account is ready.
        </Text>
      </Body>
    </Html>
  );
}
```

`previewProps` supplies the base props. Each selected `previewVariants` entry
is merged over that base, and props entered in the preview JSON editor are
merged last. Variant values can therefore contain only the fields that differ
from the base case.

For compatibility with templates that follow the React Email convention, a
component-level `PreviewProps` value is used when the module has no named
`previewProps` export:

```tsx
function ReceiptEmail({ orderId }: { orderId: string }) {
  return <div>Receipt for {orderId}</div>;
}

ReceiptEmail.PreviewProps = {
  orderId: 'order_123',
};

export default ReceiptEmail;
```

When both forms exist, the named `previewProps` export takes precedence over
`Component.PreviewProps`.

## Run The Preview

Run the installed binary from the email project:

```bash
chakra-email-preview --config chakra-email.config.ts
```

An npm script keeps that command consistent for the team:

```json
{
  "scripts": {
    "email:dev": "chakra-email-preview --config chakra-email.config.ts"
  }
}
```

```bash
npm run email:dev
```

The CLI accepts:

- `--config <path>`, `-c <path>` to select a configuration file.
- `--host <host>` to override the configured host.
- `--port <port>`, `-p <port>` to override the configured port.
- `--allow-remote` to acknowledge a non-loopback bind explicitly.
- `--help`, `-h` to print command help.
- `--version`, `-v` to print the package version.

Host and port flags take precedence over values in the configuration file.

The workspace toolbar can download the active HTML, plain-text, or source
output. For repeatable build artifacts, export every template from the CLI:

```bash
chakra-email-preview export \
  --config chakra-email.config.ts \
  --out-dir dist/emails
```

Export includes the default props and every named preview variant. Use
`--default-only` to omit variants, `--format html|text|both` to select output,
or `--compact` to skip HTML pretty-printing. Output paths mirror template paths
and variant filenames include a deterministic suffix to prevent collisions.

## Test-send adapters

Test sending is opt-in and provider-neutral. Supply an adapter in the local
config; it receives the same HTML, text, props, and variant currently rendered
by the preview:

```ts
import { Resend } from 'resend';
import { defineConfig } from '@chakra-email/preview';

const resend = new Resend(process.env.RESEND_API_KEY);

export default defineConfig({
  testSend: {
    async send(message) {
      const { data, error } = await resend.emails.send({
        from: 'Preview <preview@example.com>',
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      if (error) throw new Error(error.message);
      return { id: data?.id };
    },
  },
});
```

Provider SDKs and credentials stay in the consuming project. The adapter runs
only in the preview server and is not serialized into the browser UI. The
preview package does not send anything unless a developer submits the local
test-send form.

## Nx Libraries

Attach a continuous, non-cacheable target to the Nx library that owns the
emails. `cwd` is workspace-relative when using `nx:run-commands`:

```json
{
  "name": "@acme/emails",
  "nx": {
    "targets": {
      "email-preview": {
        "executor": "nx:run-commands",
        "continuous": true,
        "cache": false,
        "options": {
          "cwd": "packages/emails",
          "command": "chakra-email-preview --config chakra-email.config.ts"
        }
      }
    }
  }
}
```

Run it through the workspace package manager:

```bash
npm exec nx -- run @acme/emails:email-preview
```

The target is continuous because the server remains active and watches local
templates. It is not cacheable because it produces no reusable build artifact.

## Programmatic API

Use `createPreviewServer` when another development tool needs to own the server
lifecycle:

```ts
import { createPreviewServer } from '@chakra-email/preview';

const server = await createPreviewServer({
  configFile: './packages/emails/chakra-email.config.ts',
  cwd: process.cwd(),
  host: '127.0.0.1',
  port: 4100,
});

await server.listen();

process.once('SIGINT', async () => {
  await server.close();
});
```

The function accepts either `configFile` or an inline `config`, plus optional
`cwd`, `host`, `port`, and `allowRemote` overrides. The returned server exposes
`listen()` and `close()`.

Use the same one-shot exporter from build scripts:

```ts
import { exportTemplates } from '@chakra-email/preview';

const result = await exportTemplates({
  configFile: './chakra-email.config.ts',
  outDir: './dist/emails',
  format: 'both',
});
```

## Email Lint Checks

Each rendered template includes structured lint findings, and the browser
shows them in the **Client checks** panel. Findings refresh with template,
variant, and preview-prop changes and include severity, a stable rule ID,
suggested remediation, and rendered-HTML location where available. Relevant
compatibility findings link to their live Can I Email feature page; the package
does not copy support percentages that can become stale.

The checks cover malformed or incomplete documents, missing metadata and
alternative text, insecure URLs, unsupported interactive or embedded elements,
risky CSS layout, image dimensions, plain-text output, and message size.

The same rule set is available without starting a server:

```ts
import { lintRenderedEmail } from '@chakra-email/preview';

const findings = lintRenderedEmail(renderedHtml, renderedPlainText);
```

These checks surface common risks; they do not replace delivery-provider tests
or validation in the mailbox clients your application supports.

## Security And Image Privacy

The preview server is a local development tool. It binds to `127.0.0.1` by
default and refuses an intentional remote bind unless `--allow-remote` (or the
programmatic `allowRemote` option) is supplied. Do not expose it to a public or
untrusted network: discovered template modules execute locally with the same
permissions as the CLI process. Its random per-process request token is a local
request guard, not multi-user authentication; remote binding does not add
access control or TLS.

Remote images can disclose the developer's IP address, user agent, and request
timing to the image host. The preview iframe blocks remote image requests by
default; developers can opt in with the visible **Remote images** control. The
MVP does not proxy, anonymize, or cache requests after that opt-in. Prefer local
fixtures or image hosts you trust while developing.
Preview-local assets are not production email URLs; use deliberate absolute
public or `cid:` sources before sending a message.

## MVP Limits

Version `0.1.0` focuses on local template discovery, rendering, prop editing,
and variants. It does not currently provide:

- email delivery or test sending;
- a drag-and-drop or visual template editor;
- mailbox-client emulation, screenshots, or compatibility certification;
- remote-image proxying or anonymization;
- an Nx plugin, generator, or inferred target;
- a production hosting or multi-user preview service;
- isolation for untrusted template code.

Use actual delivery-provider and mailbox-client testing before treating an
email as production-ready.

## More Docs

- [Email preview guide](https://github.com/chakra-email/chakra-email/blob/main/docs/preview.md)
- [Getting started](https://github.com/chakra-email/chakra-email/blob/main/docs/getting-started.md)
- [Examples](https://github.com/chakra-email/chakra-email/tree/main/examples/preview)

## Help and contributing

See the [project README](https://github.com/chakra-email/chakra-email#readme), [open an issue](https://github.com/chakra-email/chakra-email/issues), or read the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## License

MIT

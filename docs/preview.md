# Email Preview

`@chakra-email/preview` provides a local browser application for discovering
and rendering the email templates in an application or library repository. It
is a development dependency: templates remain in their owning project, and the
preview server is not included in production email output.

## Installation

```bash
npm install --save-dev @chakra-email/preview
```

The initial release is `0.1.0`, and its executable is
`chakra-email-preview`.

## Configuration

Create `chakra-email.config.ts` in the project that owns the templates:

```ts
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  root: '.',
  templates: './src/emails',
  include: ['**/*.email.{ts,tsx}'],
  exclude: ['**/*.{test,spec}.{ts,tsx}', '**/__fixtures__/**'],
  assets: './public',
  host: '127.0.0.1',
  port: 4100,
});
```

Path resolution happens in three stages:

1. `root` is resolved from the directory containing
   `chakra-email.config.ts`.
2. `templates` and `assets` are resolved from that root.
3. Every `include` and `exclude` pattern is evaluated inside each resolved
   templates directory.

This makes the configuration independent of whether the CLI starts at the
workspace root or inside the email project. When both `templates` and `include`
are omitted, discovery defaults to `./emails` below the resolved root.

| Option      | Purpose                                                               |
| ----------- | --------------------------------------------------------------------- |
| `root`      | Base directory for template discovery and asset paths.                |
| `templates` | Directory containing template modules.                                |
| `include`   | Glob patterns for modules that should be discovered.                  |
| `exclude`   | Glob patterns removed from the discovered module set.                 |
| `assets`    | Directory of static files made available by the local preview server. |
| `host`      | Bind address; defaults to the loopback-only address `127.0.0.1`.      |
| `port`      | Listening port; defaults to `4100`.                                   |
| `renderer`  | Optional server-side email renderer adapter.                          |
| `testSend`  | Optional server-side test-delivery adapter.                           |
| `theme`     | JSON-safe theme and recipe overrides for the browser workspace.       |

A configured `assets` directory may be absent while a project is being set up.
The server still starts, and requests for missing assets return `404`.

Keep production URLs separate from preview asset paths. Email clients do not
have a reliable sender-controlled base URL, so images and links used in sent
messages should still use deliberate absolute public URLs or valid `cid:`
attachments.

## Template Contract

Each discovered module must default-export the component that represents the
email:

```tsx
import { Body, Html, Text } from 'chakra-email';

type AccountEmailProps = {
  firstName: string;
  status: 'active' | 'invited';
};

export const previewProps: AccountEmailProps = {
  firstName: 'Ada',
  status: 'active',
};

export const previewVariants = {
  Invitation: {
    status: 'invited',
  },
  'Long content': {
    firstName: 'Alexandria Catherine',
  },
} satisfies Record<string, Partial<AccountEmailProps>>;

export default function AccountEmail({ firstName, status }: AccountEmailProps) {
  return (
    <Html>
      <Body>
        <Text>
          {firstName}: account status is {status}.
        </Text>
      </Body>
    </Html>
  );
}
```

The effective component props are merged in this order:

1. the named `previewProps` export;
2. the selected entry from `previewVariants`;
3. values entered in the preview JSON editor.

Later sources override earlier ones. A variant can therefore contain a partial
props object that changes only the scenario-specific values.

If a module does not export named `previewProps`, the server also recognizes a
`PreviewProps` value attached to the default component:

```tsx
function ResetPasswordEmail({ token }: { token: string }) {
  return <div>Reset token: {token}</div>;
}

ResetPasswordEmail.PreviewProps = {
  token: 'preview-token',
};

export default ResetPasswordEmail;
```

This fallback supports the convention used by existing React Email templates.
When both forms exist, the named `previewProps` export wins.

## CLI

Start the preview from the project containing the configuration:

```bash
chakra-email-preview --config chakra-email.config.ts
```

| Flag                    | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `--config <path>`, `-c` | Select a configuration file.                        |
| `--host <host>`         | Override the configured bind address.               |
| `--port <port>`, `-p`   | Override the configured port.                       |
| `--allow-remote`        | Explicitly allow binding to a non-loopback address. |
| `--help`, `-h`          | Show command usage.                                 |
| `--version`, `-v`       | Print the installed package version.                |

Export deterministic artifacts with the same config and renderer:

```bash
chakra-email-preview export \
  --config chakra-email.config.ts \
  --out-dir dist/emails \
  --format both
```

The exporter writes the default template and every named preview variant.
`--default-only` omits variants, `--format` accepts `html`, `text`, or `both`,
and `--compact` disables HTML pretty-printing. The browser workspace also has a
Download action for the currently visible HTML, text, or source output.

CLI host and port values override the configuration file. To preview from
another device on a trusted local network, both a non-loopback host and the
explicit acknowledgement are required:

```bash
chakra-email-preview \
  --config chakra-email.config.ts \
  --host 0.0.0.0 \
  --allow-remote
```

Do not use this as a public server.

## npm Script

Add a script to the project that owns the templates:

```json
{
  "scripts": {
    "email:dev": "chakra-email-preview --config chakra-email.config.ts"
  }
}
```

Then run:

```bash
npm run email:dev
```

In an npm workspace, the root can delegate to the email package:

```bash
npm run email:dev --workspace @acme/emails
```

## Nx Library Target

An Nx library can own both the templates and the continuous preview target. No
separate application needs to be generated. Add this target to the library's
`package.json` or equivalent project configuration:

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

The `cwd` value is relative to the workspace root. Run the target with the
workspace package manager:

```bash
npm exec nx -- run @acme/emails:email-preview
```

`continuous: true` tells Nx that the task intentionally stays alive. The target
is non-cacheable because it creates a local server rather than a reusable output
artifact. The MVP does not yet ship an Nx plugin or infer this target from the
configuration file.

## Programmatic API

`createPreviewServer` allows another development tool or test harness to manage
the server lifecycle:

```ts
import { createPreviewServer } from '@chakra-email/preview';

const server = await createPreviewServer({
  configFile: './packages/emails/chakra-email.config.ts',
  cwd: process.cwd(),
  host: '127.0.0.1',
  port: 4100,
});

await server.listen();

try {
  // Run local tooling that consumes the preview server.
} finally {
  await server.close();
}
```

The factory accepts:

- `configFile` to load a configuration file, or `config` for an inline
  configuration object;
- `cwd` as the base for a relative configuration-file path;
- `host` and `port` overrides;
- `allowRemote` to acknowledge a non-loopback host programmatically.

It returns a server with asynchronous `listen()` and `close()` methods.

Build scripts can call `exportTemplates()` without starting the HTTP server:

```ts
import { exportTemplates } from '@chakra-email/preview';

await exportTemplates({
  configFile: './chakra-email.config.ts',
  outDir: './dist/emails',
  includeVariants: true,
  format: 'both',
});
```

## Test Sending

The preview can render the active template and hand it to any delivery
provider through an optional server-only adapter:

```ts
import { Resend } from 'resend';
import { defineConfig } from '@chakra-email/preview';

const resend = new Resend(process.env.RESEND_API_KEY);

export default defineConfig({
  testSend: {
    async send({ html, subject, text, to }) {
      const { data, error } = await resend.emails.send({
        from: 'Preview <preview@example.com>',
        to,
        subject,
        html,
        text,
      });

      if (error) throw new Error(error.message);
      return { id: data?.id };
    },
  },
});
```

Configuring `testSend` adds a test-delivery form to the inspector. Leaving it
out removes that UI and the endpoint remains unavailable. The transport also
receives template metadata, effective props, and the selected variant, so an
application can add logging or provider-specific metadata without a package
adapter. Provider credentials remain in the server process and are never
included in the browser configuration.

## Email Lint Checks

Every rendered template is linted before the response reaches the browser. The
**Client checks** panel reports errors, warnings, and informational findings
with a rule ID, suggested fix, affected element, and rendered-HTML line when
available. Results refresh when the template, variant, or edited props change.
Where a rule maps cleanly to upstream compatibility data, the finding includes
a stable link to the live Can I Email feature page instead of a copied support
percentage that could become stale.

The built-in checks cover:

- malformed or incomplete email documents;
- missing language, title, preview text, viewport, and character metadata;
- images without alternative text or explicit dimensions;
- insecure asset and link URLs;
- scripts, forms, embedded content, SVG, native buttons, and media elements;
- external stylesheets and risky flex, grid, fixed, sticky, or background-image
  CSS;
- empty plain-text output and HTML large enough to risk message clipping.

The programmatic `lintRenderedEmail(html, plainText?)` export returns the same
structured findings used by the preview UI. Lint results are advisory: they
catch common compatibility and accessibility problems, but they are not a
mailbox-client renderer or compatibility certification.

## Local Security

The loopback default is deliberate. Template modules are executable code and
run with the filesystem, environment, and network permissions of the preview
process. Do not load templates from an untrusted repository, and do not expose
the server to the internet. The random per-process request token is a local
request guard, not multi-user authentication. `--allow-remote` removes a bind
safety check; it does not add access control, TLS, or sandboxing.

Treat preview props as local source code too. Do not put production credentials,
access tokens, customer addresses, or other sensitive data in configuration,
template fixtures, or the JSON props editor.

A configured test-send transport is an external side effect. Use a dedicated
development sender and recipient allow-list where the provider supports one;
the preview validates request shape but cannot enforce provider account policy.

## Remote Image Privacy

Remote images can reveal a developer's IP address, user agent, and request
timing to their origin. The preview iframe blocks remote image requests by
default; the visible **Remote images** control provides an explicit opt-in when
they need to be inspected. The server does not proxy, anonymize, or cache
requests after that opt-in. Prefer local fixture assets or image origins you
control while iterating. A preview-local asset URL is not automatically valid
in a delivered email, so replace it with an absolute public URL or attachment
`cid:` before sending.

## MVP Scope

The `0.1.0` preview focuses on local template discovery, rendering, variants,
editable props, exports, and provider-neutral test sends. It is not currently:

- an email-delivery provider or inbox placement service;
- a drag-and-drop visual editor;
- a mailbox-client emulator or screenshot matrix;
- a remote-image privacy proxy;
- a hosted collaboration environment;
- an Nx plugin, generator, or inferred-task provider;
- a sandbox for untrusted template code.

Always validate production messages through the actual delivery provider and
the supported mailbox-client matrix. A browser preview is a development aid,
not proof of email-client compatibility.

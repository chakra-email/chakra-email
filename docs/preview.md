# Email Preview

`@chakra-email/preview` provides a local browser application for discovering
and rendering the email templates in an application or library repository. It
is a development dependency: templates remain in their owning project, and the
preview server is not included in production email output.

## Installation

```bash
npm install --save-dev @chakra-email/preview
```

Its executable is `chakra-email-preview`.

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
  allowedHosts: ['chakra-email.test'],
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

| Option         | Purpose                                                               |
| -------------- | --------------------------------------------------------------------- |
| `root`         | Base directory for template discovery and asset paths.                |
| `templates`    | Directory containing template modules.                                |
| `include`      | Glob patterns for modules that should be discovered.                  |
| `exclude`      | Glob patterns removed from the discovered module set.                 |
| `assets`       | Directory of static files made available by the local preview server. |
| `host`         | Bind address; defaults to the loopback-only address `127.0.0.1`.      |
| `allowedHosts` | Exact trusted reverse-proxy hostnames; wildcards and ports fail.      |
| `port`         | Listening port; defaults to `4100`.                                   |
| `renderer`     | Optional server-side email renderer adapter.                          |
| `previewFrom`  | Default preview sender, as an address or `Name <address>`.            |
| `openInEditor` | Allow local editor launches; defaults to `true` on loopback hosts.    |
| `lint.rules`   | Per-rule severity overrides: `off`, `info`, `warning`, or `error`.    |
| `testSend`     | Optional server-side test-delivery adapter.                           |
| `theme`        | JSON-safe theme and recipe overrides for the browser workspace.       |

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

export const previewSubject = (props: AccountEmailProps) =>
  `${props.firstName}, your account is ${props.status}`;

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

Variant objects merge recursively with the base fixture, so a nested partial
object preserves unchanged siblings. Arrays, scalar values, and `null` replace
the base value. Live editor values override top-level keys last, replacing each
edited value in full so removed nested fields stay removed.

`previewSubject` accepts a string or a synchronous/async function of the fully
merged props. It is validated as an email subject, displayed in the preview,
used as the default test-send subject, and included in exported metadata.

`previewFrom` accepts one ASCII mailbox address, optionally with a Unicode
display name: `Forward <hello@forward.domains>`. Set it in the config for a
default, or export a string or synchronous/async function from a template to
override it with the merged props. Invalid addresses, recipient lists, and
CR/LF header injection are rejected at config load or template render.

```ts
export const previewFrom = 'Forward <hello@forward.domains>';
// Or: export const previewFrom = (props) => `${props.brand} <hello@example.com>`;
```

This metadata controls the preview and `.eml` export only. Your `testSend`
adapter still owns the provider's actual sender configuration.

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

## Preview workspace

The local workspace uses one top bar with Preview, Compare, HTML, Text, and
Source views, a filterable template sidebar, and a Props / Info / Checks
inspector. Desktop and Mobile presets use 600px and 375px; Compare shows
desktop/light, mobile/light, and mobile/dark together.

The HTML view formats nested markup with 2-space indentation by default. Its
**Indentation** selector offers 2, 4, or 8 spaces, or **Original** to show the
unformatted response. The choice is saved in this browser. Formatting changes
only the display: copy/download, test sending, linting, and message-size totals
still use the original rendered HTML. Lint links and highlights map original
line/column positions to the displayed line numbers; a link's tooltip retains
the original location. Inline text, attributes, comments (including Outlook
conditional markup), and raw sections such as `pre`, `textarea`, `script`, and
`style` are preserved. Complex parser repairs, extreme nesting, and unusually
large inputs fall back to the original view rather than risk altering markup.

Props supports generated fields or JSON. Fields retain their fixture types while
you edit: invalid or empty number drafts show an inline error rather than becoming
strings, and clearing an originally `null` field restores `null`. Arrays, empty
nested objects, and objects with more than 20 scalar leaves use JSON instead.
Edits render after 300ms of inactivity; invalid fields or JSON leave the previous
render visible. Reset props restores the
selected fixture and variant. The inbox row shows the sender, subject, and
server-normalized hidden preheader, with the variant selector above it.
Late variant or watch responses preserve props edited while a request was in
flight; the debounced edit then renders against the current selection.

**Copy as variant** opens an inline name field (defaulting to the next variant
number), then copies a single-quoted entry for `previewVariants`. Only keys that
differ from the template's base `previewProps` are included, with a deep diff for
objects and whole values for changed arrays. Wait for props to finish rendering
before copying. The action reads the current base fixture without switching the
visible preview, and never writes to your template files.
Variants merge nested objects with the base fixture. Removed fixture keys and
empty-object replacements that would restore deleted keys cannot be copied;
keep those keys or update `previewProps` in your source. Arrays are replaced as
whole values, so removing array items is supported. Variant names cannot be
`__proto__`, `constructor`, or `prototype`. Editing props or the name while the
base fixture loads cancels the pending copy rather than writing stale clipboard data.

The status bar reports frame dimensions, UTF-8 message size, links, images, and
findings. Its findings tally opens Checks, which includes passed rules from the
effective server catalog. Sidebar counts come from background renders of each
template's default fixture, including templates you have not opened. They do
not change when you select a variant or edit props; the active Checks tab and
status bar still describe the current preview.

Summaries start after discovery and refresh after changes, with a 500ms debounce
and at most two background templates in flight. Explicit renders take priority.
Cancelled generations cannot publish stale results, render failures count as
one error, and newly connected SSE clients receive the latest complete summary.
Rows show no indicator until the first summary arrives.

Checks cards open one at a time. Select a finding to outline its affected
element in Preview and all Compare frames; **HTML line N** opens and scrolls to
the highlighted rendered-HTML line. Selecting the card again or pressing Escape
clears it. Selection survives a re-render only while the same finding remains.
Outlines use injected CSS, never iframe scripts, and do not change copied or
exported HTML. The client grid filters findings to known breakages for that
client; its reviewed date and disclaimer distinguish this from a rendering test.

Use Export for HTML/plain-text copy and downloads or a local multipart `.eml`
message. The `.eml` sender uses `previewFrom` when supplied, or defaults to
`preview@localhost`; exporting does not send email. Display names and subjects
are safely encoded for non-ASCII text. A configured test-send transport enables
a top-bar Send test popover.

Info's **Open in editor** action (also in the command palette) launches only
discovered template source files, with the same request token and origin checks
as rendering. It is hidden for non-loopback binds and when `openInEditor` is
`false`. Set `LAUNCH_EDITOR` or `EDITOR` if editor auto-detection fails. Launches
are acknowledged after a short immediate-error window, not when the editor
closes; failures reported later by a GUI editor cannot be reflected in that
completed request.

⌘K / Ctrl K opens the command palette, grouped into Templates, View, Preview,
Workspace, and Actions. Search includes template groups and source paths. Use
Up/Down or Home/End to select a command, Enter to run it, and Escape to return
focus to the opener. Preview offers explicit viewport, email color, and remote
image settings. Actions includes available link checks and editor controls,
HTML copy, `.eml` download, and Send test. Send test opens and focuses its recipient
popover; it never sends automatically. Disabled or unavailable actions cannot run.
The interface follows the OS unless overridden;
email Light/Dark remains a separate preview setting. Outside text fields, use
`/` to filter, `1`–`5` for views, `d` / `m` for viewports, `l` for email color,
and `[` / `]` for panels. On narrow screens the panels become overlay sheets.
Remote images remain blocked by default, including in Compare.

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
Every export writes a deterministic `manifest.json` containing source paths,
template IDs, variants, subjects, and relative artifact paths. The
programmatic API accepts `manifest: false` when it is not needed.

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

When Springbar, Caddy, or another local reverse proxy supplies a routed Host
header, list that hostname explicitly without changing the loopback bind:

```ts
export default defineConfig({
  host: '127.0.0.1',
  allowedHosts: ['chakra-email.test'],
});
```

This is an exact DNS-rebinding exception, not a wildcard or an authentication
mechanism.

## Checks in CI

Run the same checks without starting the preview server or sending mail:

```bash
chakra-email-preview check --config chakra-email.config.ts
chakra-email-preview check --strict --default-only
chakra-email-preview check --format json --rule document-title=warning
```

By default, checks render every template and named variant. Errors fail with exit
code `1`; warnings fail only with `--strict`. A template that cannot render is
reported as a `render-failed` error, and the other templates and known variants
are still checked. Configuration, discovery, or fatal run failures exit `2`.
Successful checks exit `0`. `--default-only` skips variants.

Repeat `--rule id=level` to override severities (`off`, `info`, `warning`, `error`):
rule defaults are overridden by `lint.rules`, then by CLI flags. Network checks
are off unless `--check-links` is passed, which also requires configured
`linkCheck` hosts. No check sends email.

Add a package script and a GitHub Actions step after installing dependencies:

```json
{
  "scripts": {
    "email:check": "chakra-email-preview check --strict"
  }
}
```

```yaml
- name: Check email templates
  run: pnpm run email:check
```

For an Nx library in `packages/emails`, add an explicit target:

```json
{
  "email-check": {
    "executor": "nx:run-commands",
    "cache": true,
    "inputs": ["{projectRoot}/**/*"],
    "options": {
      "cwd": "packages/emails",
      "command": "chakra-email-preview check"
    }
  }
}
```

Include any shared template/config dependencies in that target's inputs. Do not
cache a target that enables network checks: remote results can change without
local file changes. The package does not infer an `email-check` target.

`--format json` prints a versioned report with `summary` counts and `results`
sorted by path, variant, and HTML location. Programmatic consumers can call
`checkTemplates({ configFile, includeVariants, checkLinks, rules })` to receive
that same report; the caller decides whether warnings should fail its process.

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
artifact. Configure the target explicitly: the preview CLI does not require an
Nx plugin or infer targets from its configuration file.

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

Configuring `testSend` adds a test-delivery popover to the top bar. Leaving it
out removes that UI and the endpoint remains unavailable. The transport also
receives template metadata, effective props, and the selected variant, so an
application can add logging or provider-specific metadata without a package
adapter. Provider credentials remain in the server process and are never
included in the browser configuration.

Mailpit works through the same provider-neutral contract. Install Nodemailer
in the consuming project and connect to Mailpit's local SMTP port:

```ts
import nodemailer from 'nodemailer';
import { defineConfig } from '@chakra-email/preview';

const smtp = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 1025,
  secure: false,
});
const recipients = new Set(['developer@example.test']);

export default defineConfig({
  testSend: {
    async send(message) {
      if (!recipients.has(message.to.toLowerCase())) {
        throw new Error('Recipient is not allowed for local preview.');
      }
      const result = await smtp.sendMail({
        from: 'preview@example.test',
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { id: result.messageId };
    },
  },
});
```

Do not expose a provider-backed test-send endpoint publicly. Use development
credentials, a recipient allowlist, and a trusted network even when
`allowedHosts` is configured.

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

### Rule catalog and severity overrides

The catalog also checks for unfinished placeholder text, rounded links without
an Outlook VML fallback, missing color-scheme metadata, subjects over 60
characters, preheaders outside 40–150 characters, and empty or ambiguous link
text. Subject length runs only when a subject is supplied. Element findings
include a unique CSS `selector` for the rendered HTML, not a TSX source location.
The exported `extractPreviewText(document)` accepts a parse5 document and removes
hidden-preheader padding before returning normalized text.

Use `lint.rules` in `chakra-email.config.ts` to adjust existing checks:

```ts
export default defineConfig({
  lint: {
    rules: {
      'document-title': 'warning',
      'css-background-image': 'off',
      'link-redirect': 'warning',
    },
  },
});
```

Unknown rule IDs and invalid severities fail configuration loading. Overrides
apply to every template and variant, including the explicit **Check links**
action. They do not enable network access or change rendered email output.
Rules set to `off` produce no findings.

The Checks link list starts at **not checked**. Explicit link checks show the
actual successful HTTP code, redirect code, or a broken, skipped, or unverified
status for each occurrence, including duplicate URLs. Redirects are not followed;
HEAD responses do not certify that a destination works in a browser. A fresh
render clears these statuses, and older servers without per-link metadata never
imply success. Network access remains opt-in and allowlisted.

For programmatic consumers, the shared catalog and evaluated rule IDs are
available without starting a server:

```ts
import { getLintRules, lintEmail } from '@chakra-email/preview';

const rules = { 'document-title': 'warning' } as const;
const catalog = getLintRules(rules);
const { findings, rulesRun } = lintEmail(renderedHtml, {
  text: renderedPlainText,
  rules,
});
```

Catalog entries contain `id`, `category`, a passing-condition `title`, and the
effective `severity`; disabled rules are omitted. `rulesRun` lists enabled
static checks, including passing checks, but excludes the plain-text check
when no `text` was supplied. It never includes network link checks. The existing
`lintRenderedEmail()` convenience function retains its original default behavior.

### Known client breakages

Mapped compatibility findings include `clients` IDs from a deliberately short
list reviewed against Can I Email in October 2026. Each rule links to its source;
partial or conditional support is not treated as a blanket failure. Windows
means classic Outlook, not the new web-based Outlook client. The exported
`previewClients`, `knownBreakages`, and `clientSupportReviewed` describe this
curation. An unlisted client is not guaranteed to support a feature. This is
advisory metadata, not an actual mailbox rendering test.

## Local Security

The loopback default is deliberate. Template modules are executable code and
run with the filesystem, environment, and network permissions of the preview
process. Do not load templates from an untrusted repository, and do not expose
the server to the internet. The random per-process request token is a local
request guard, not multi-user authentication. `--allow-remote` removes a bind
safety check; it does not add access control, TLS, or sandboxing.
Likewise, `allowedHosts` permits only named Host headers; it does not authenticate
the caller.

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

## Scope

The preview is a local development tool, not:

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

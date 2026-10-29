# chakra-email

Build React email templates with Chakra-style props, theme tokens, and email-safe HTML and plain-text rendering.

[Documentation](https://chakra.email) · [Getting started](https://chakra.email/docs/getting-started) · [Examples](https://chakra.email/examples) · [Issues](https://github.com/chakra-email/chakra-email/issues)

[![npm](https://img.shields.io/npm/v/chakra-email?style=flat-square)](https://www.npmjs.com/package/chakra-email)
[![NPM](https://img.shields.io/npm/l/chakra-email?style=flat-square)](https://github.com/chakra-email/chakra-email/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/dt/chakra-email?style=flat-square)](https://www.npmjs.com/package/chakra-email)
[![CI](https://img.shields.io/github/actions/workflow/status/chakra-email/chakra-email/ci.yml?style=flat-square&label=CI)](https://github.com/chakra-email/chakra-email/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/chakra-email/chakra-email/branch/main/graph/badge.svg)](https://codecov.io/gh/chakra-email/chakra-email)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/ryanhefner?style=flat-square&label=sponsors)](https://github.com/sponsors/ryanhefner)

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Most applications should start with `chakra-email`. It includes components, built-in email styling, optional Chakra UI v3-style theme adaptation, and render utilities. You do **not** need to install `@chakra-ui/react` or use Chakra UI in your application.

## Why Chakra Email?

- **Familiar styling** — compose React templates with Chakra-style props and reusable tokens.
- **Email-safe output** — generate inline HTML and matching plain text without browser-only interactions.
- **A complete local workflow** — preview templates, edit props, compare variants, and inspect email checks.
- **Configurable safety boundaries** — strict URL policies, Markdown admission limits, and rendered-output byte ceilings.

## Install

```bash
npm install chakra-email react react-dom
```

React 18 and 19 are supported. Packages are ESM-only: use `import` in an ESM-capable server or build tool. Node.js 24 is recommended; the published engine compatibility floor remains Node.js 20.19.

## Quick start

Save this as `src/emails/welcome.email.tsx`. No custom theme is needed:

<!-- quickstart:start -->

```tsx
import {
  Body,
  Button,
  ChakraEmailProvider,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  renderEmail,
} from 'chakra-email';

export default function WelcomeEmail() {
  return (
    <ChakraEmailProvider>
      <Html lang="en">
        <Head>
          <title>Welcome to Acme</title>
        </Head>
        <Preview>Your Acme account is ready.</Preview>
        <Body bg="gray.50">
          <Container bg="white" p={6} maxW="600px">
            <Heading as="h1" fontSize="2xl">
              Welcome!
            </Heading>
            <Text>Thanks for joining us. Your account is ready.</Text>
            <Button href="https://example.com/get-started">Get started</Button>
          </Container>
        </Body>
      </Html>
    </ChakraEmailProvider>
  );
}

export async function renderWelcomeEmail() {
  const { html, text } = await renderEmail(<WelcomeEmail />);
  return { html, text };
}
```

<!-- quickstart:end -->

Call `renderWelcomeEmail()` from your server-side send handler and pass its `html` and `text` to your email provider. Chakra Email renders messages; it does not send mail or require a particular delivery service. Keep provider credentials on the server.

## Preview locally

Keep the default-exported template above, then install the optional development tool:

```bash
npm install --save-dev @chakra-email/preview
```

Create `chakra-email.config.ts` in your project root:

```ts
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({ templates: './src/emails' });
```

Add this script to your existing `package.json`:

```json
{
  "scripts": {
    "email:dev": "chakra-email-preview --config chakra-email.config.ts"
  }
}
```

Run `npm run email:dev` and open `http://127.0.0.1:4100`. Each discovered module must default-export an email component; parameterized templates can additionally export `previewProps` and `previewVariants`. The [preview guide](https://chakra.email/docs/preview) covers live prop editing, variants, linting, and privacy controls.

## Markdown bodies and code blocks

Install the optional adapter for recipe-driven GitHub Flavored Markdown:

```bash
npm install @chakra-email/markdown
```

```tsx
import { Markdown } from '@chakra-email/markdown';

export function ReleaseNotesBody() {
  return (
    <Markdown codeBlockLineNumbers>
      {'# What is new\n\nYour account is ready. **Welcome aboard!**'}
    </Markdown>
  );
}
```

Use `ReleaseNotesBody` inside your email's `Container`. The adapter includes `@chakra-email/code-block` for fenced code; syntax highlighting is optional. See [Markdown](https://chakra.email/docs/markdown) and [Code Blocks](https://chakra.email/docs/code-block) for recipes, limits, and highlighter adapters. Custom AST mappings can use the lower-level primitives without making the first template depend on a parser.

## Customize after your first render

Pass a plain theme or an existing Chakra UI `createSystem()` result to `ChakraEmailProvider`. Recipes and multipart slot recipes style the internal email-safe markup. Chakra UI itself is needed only if you choose its system-building utilities.

Read [theming](https://chakra.email/docs/theming) for tokens, light/dark output, recipes, and integration examples.

## Components and rendering

- Document: `Html`, `Head`, `Font`, `Preview`, `Body`
- Layout: `Container`, `Section`, `Row`, `Column`, `Box`, `Stack`, `Spacer`
- Text and actions: `Text`, `Heading`, `Link`, `Badge`, `Button`
- Markdown primitives: `Blockquote`, `Code`, `Pre`, `Hr`, `List`, `ListItem`
- Tables and media: `Table`, `TableHead`, `TableBody`, `TableFoot`, `TableRow`, `TableHeader`, `TableCell`, `TableCaption`, `Img`

Use `renderEmail(element)` for matching `{ html, text }` from one render, `render(element)` for HTML only, or `renderPlainText(element)` for plain text. Focused imports are available from `chakra-email/render` and `chakra-email/security`.

The [components](https://chakra.email/docs/components) and [rendering](https://chakra.email/docs/rendering) guides cover the full API. Browser-only layout and interaction are not portable to email clients: test representative clients before sending.

## Choose a package

| Package                                                                              | Use it for                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [`chakra-email`](https://chakra.email/docs/getting-started)                          | Most applications: components, built-in themes, and rendering |
| [`@chakra-email/chakra-v2`](https://chakra.email/docs/chakra-v2)                     | Adapting existing Chakra UI v2 themes                         |
| [`@chakra-email/core`](https://chakra.email/docs/package-architecture)               | Building renderer adapters and custom tooling                 |
| [`@chakra-email/preview`](https://chakra.email/docs/preview)                         | Local previews, editable props, variants, and checks          |
| [`@chakra-email/react-email`](https://chakra.email/docs/rendering#renderer-adapters) | Using a React Email renderer with preview tooling             |
| [`@chakra-email/markdown`](https://chakra.email/docs/markdown)                       | Rendering Markdown bodies with email-safe components          |
| [`@chakra-email/code-block`](https://chakra.email/docs/code-block)                   | Recipe-driven code blocks and optional highlighting           |

## Safety

Keep raw HTML disabled in Markdown unless you sanitize it first. Use deliberate absolute public URLs for links and images, or valid `cid:` image attachments: email clients cannot reliably resolve relative paths. The default URL policy omits unsupported, relative, credentialed, malformed, control-bearing, and oversized URLs.

For stricter rendering, import `EmailRenderError`, `strictEmailSecurityPolicy`, and `strictEmailOutputLimits` from `chakra-email/security`. See [rendering](https://chakra.email/docs/rendering) for policy and final HTML/text byte limits.

## Documentation and examples

- [Getting started](https://chakra.email/docs/getting-started)
- [Components](https://chakra.email/docs/components), [theming](https://chakra.email/docs/theming), and [rendering](https://chakra.email/docs/rendering)
- [Local preview](https://chakra.email/docs/preview) and [package architecture](https://chakra.email/docs/package-architecture)
- [Copyable examples](https://chakra.email/examples) and their [source](https://github.com/chakra-email/chakra-email/tree/main/examples)
- [Email-client test matrix](https://github.com/chakra-email/chakra-email/blob/main/docs/email-client-test-matrix.md)

## Agent skill

The repository includes a portable [`compose-chakra-email`](skills/compose-chakra-email) skill for agents composing, theming, previewing, rendering, migrating, or troubleshooting Chakra Email templates. Install it from this repository with a compatible Agent Skills client, or ask Codex's `$skill-installer` to install the skill from its GitHub directory.

## Help and contributing

[Open an issue](https://github.com/chakra-email/chakra-email/issues), browse [examples](https://chakra.email/examples), or read the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## Development

Contributors should use the repository's pinned Node.js 24 version from `.nvmrc` and the pnpm version declared in `packageManager`. The published Node.js 20.19 compatibility floor is not the development toolchain.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run site:dev
pnpm run email:dev
pnpm run check
pnpm nx run chakra-email-monorepo:yalc-publish
```

Springbar provides the docs site at `chakra-email.test` and the local email
preview at `preview.chakra-email.test`. The preview service builds the local
preview package and serves the templates in `examples/preview/emails`, using
Springbar's assigned port while remaining bound to `127.0.0.1`.

The docs site uses Next.js; the local email preview remains Vite-based. For
Vercel, select the Next.js preset with `apps/site` as the Root Directory and
leave the Output Directory automatic. See the [deployment guide](apps/site/DEPLOYMENT.md).

`pnpm run check` is the canonical release gate. It audits dependencies, lints,
runs coverage tests, performs a clean build and typecheck, compiles the examples,
checks the production docs routes and search API, inspects package contents,
and installs the resulting tarballs in a clean React
18 consumer for runtime and declaration checks.

## License

[MIT](LICENSE)

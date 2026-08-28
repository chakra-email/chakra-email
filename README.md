# chakra-email

Build React email templates with Chakra-style props, theme tokens, markdown-body primitives, and email-safe inline HTML.

`chakra-email` is for teams that like Chakra UI's styling model and want email templates that can be rendered on the server with React. It provides email-safe components, Chakra-style theme resolution, HTML rendering, and plain-text rendering.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

[![npm](https://img.shields.io/npm/v/chakra-email?style=flat-square)](https://www.pkgstats.com/pkg:chakra-email)
[![NPM](https://img.shields.io/npm/l/chakra-email?style=flat-square)](LICENSE)
[![npm](https://img.shields.io/npm/dt/chakra-email?style=flat-square)](https://www.pkgstats.com/pkg:chakra-email)
[![CI](https://img.shields.io/github/actions/workflow/status/chakra-email/chakra-email/ci.yml?style=flat-square&label=CI)](https://github.com/chakra-email/chakra-email/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/chakra-email/chakra-email/branch/main/graph/badge.svg)](https://codecov.io/gh/chakra-email/chakra-email)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/ryanhefner?style=flat-square&label=sponsors)](https://github.com/sponsors/ryanhefner)

## Why Chakra Email?

- **A familiar styling model** — compose templates with Chakra-style props and reusable theme tokens.
- **Email-safe output** — render static inline HTML and plain text without relying on browser-only layout or interaction.
- **A complete local workflow** — preview templates, edit representative props, exercise variants, and catch common email issues before sending.

## Install

```bash
npm install chakra-email react react-dom
```

Use `@chakra-email/chakra-v2` instead when you need to adapt an existing Chakra UI v2 theme object.

> [!NOTE]
> These packages are ESM-only (no CommonJS build). Node.js 22 or 24 is recommended and exercised by the primary CI matrix. Node.js 20.19 is retained only as a compatibility floor for unflagged `require()` of ESM modules; Node 20 is end-of-life and should not be used for new deployments.

## First Email

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
  render,
} from 'chakra-email';

const theme = {
  tokens: {
    colors: {
      brand: {
        500: { value: '#6366f1' },
      },
    },
  },
};

export async function renderWelcomeEmail() {
  return render(
    <ChakraEmailProvider theme={theme}>
      <Html lang="en">
        <Head />
        <Preview>Welcome to Acme.</Preview>
        <Body bg="gray.50">
          <Container bg="white" p={6} maxW="600px">
            <Heading as="h1" fontSize="2xl" mb={4}>
              Welcome!
            </Heading>
            <Text color="gray.700" mb={6}>
              Thanks for joining us. Your account is ready.
            </Text>
            <Button
              href="https://example.com/get-started"
              bg="brand.500"
              color="white"
            >
              Get Started
            </Button>
          </Container>
        </Body>
      </Html>
    </ChakraEmailProvider>,
    { pretty: true },
  );
}
```

Pass the rendered HTML and plain-text output to any email delivery provider; Chakra Email does not lock you into a sending service.

## Preview Templates Locally

Install the reusable preview development tool alongside your email library:

```bash
npm install --save-dev @chakra-email/preview
```

```ts
// chakra-email.config.ts
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  root: '.',
  templates: './src/emails',
  assets: './public',
});
```

```json
{
  "scripts": {
    "email:dev": "chakra-email-preview --config chakra-email.config.ts"
  }
}
```

The local app discovers default-exported TS/TSX templates, watches their
dependencies, renders HTML and plain text, supports JSON props and named
variants, and keeps rendered output inside a scriptless sandboxed iframe. See
the [preview guide](docs/preview.md) for the template contract, privacy controls,
programmatic API, and Nx target configuration.

## Markdown Bodies

Install the optional Markdown package for a ready-to-use, recipe-driven GFM renderer:

```bash
npm install @chakra-email/markdown
```

```tsx
import { Markdown } from '@chakra-email/markdown';

<Markdown codeBlockLineNumbers>{markdown}</Markdown>;
```

Fenced code uses the optional `@chakra-email/code-block` package, which is installed with the Markdown adapter. Both packages expose slot recipes and CodeBlock accepts a synchronous Prism, Shiki, or custom highlighter adapter.

If you need complete control of the AST mapping, use `react-markdown` directly. Mapping its elements to Chakra Email components keeps the rendered HTML email-safe while letting the email body come from a markdown document.

For example, with `react-markdown`:

```bash
npm install react-markdown
```

```tsx
import ReactMarkdown, { type Components } from 'react-markdown';
import {
  Blockquote,
  Code,
  Heading,
  Hr,
  Img,
  Link,
  List,
  ListItem,
  Pre,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from 'chakra-email';

// Replace this with the stable public directory that hosts the linked pages
// and images referenced by your Markdown content.
const markdownPublicBaseUrl = new URL('https://example.com/content/');

function resolveMarkdownUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith('#')) {
    return normalized;
  }

  try {
    return new URL(normalized, markdownPublicBaseUrl).href;
  } catch {
    return undefined;
  }
}

const markdownComponents: Components = {
  p: ({ children }) => <Text>{children}</Text>,
  h1: ({ children }) => <Heading as="h1">{children}</Heading>,
  h2: ({ children }) => <Heading as="h2">{children}</Heading>,
  a: ({ href, children }) => {
    const resolvedHref = resolveMarkdownUrl(href);

    return resolvedHref ? (
      <Link href={resolvedHref}>{children}</Link>
    ) : (
      <>{children}</>
    );
  },
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  code: ({ children }) => <Code>{children}</Code>,
  pre: ({ children }) => <Pre>{children}</Pre>,
  ul: ({ children }) => <List>{children}</List>,
  ol: ({ children }) => <List as="ol">{children}</List>,
  li: ({ children }) => <ListItem>{children}</ListItem>,
  img: ({ src, alt }) => {
    const resolvedSrc = resolveMarkdownUrl(src);

    return resolvedSrc ? <Img src={resolvedSrc} alt={alt ?? ''} /> : null;
  },
  hr: () => <Hr />,
  table: ({ children }) => <Table>{children}</Table>,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableHeader>{children}</TableHeader>,
  td: ({ children }) => <TableCell>{children}</TableCell>,
};

export function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
  );
}
```

If you enable raw HTML in your markdown parser, sanitize it first. Raw HTML can bypass the email-safe component layer.

Email clients do not share a dependable base URL for resolving relative paths.
Resolve relative Markdown links and images against a deliberate public base, as
shown above, before passing them to Chakra Email components. `Link` and
`Button` keep `http:`, `https:`, `mailto:`, `tel:`, and fragment destinations;
`Img` keeps `http:`, `https:`, and `cid:` sources. Unsupported or relative
component URLs are omitted from the rendered markup rather than guessed. URL
resolution establishes an origin for relative content; the component protocol
allowlists still provide the final output safeguard.

## Components

| Markdown or email need | Components                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Document shell         | `Html`, `Head`, `Font`, `Preview`, `Body`                                                              |
| Layout                 | `Container`, `Section`, `Row`, `Column`, `Box`, `Stack`, `Spacer`                                      |
| Text                   | `Text`, `Heading`, `Link`, `Badge`                                                                     |
| Markdown blocks        | `Blockquote`, `Code`, `Pre`, `Hr`                                                                      |
| Lists                  | `List`, `ListItem`                                                                                     |
| Tables                 | `Table`, `TableHead`, `TableBody`, `TableFoot`, `TableRow`, `TableHeader`, `TableCell`, `TableCaption` |
| Media and actions      | `Img`, `Button`                                                                                        |

## Rendering

```tsx
import { render, renderEmail, renderPlainText } from 'chakra-email';

const html = await render(<Email />, { pretty: true });
const text = await renderPlainText(<Email />);
const output = await renderEmail(<Email />, { pretty: true });
```

`render` outputs static HTML with an email doctype. `renderPlainText` creates a plain-text version from the rendered email. `renderEmail` produces matching HTML and plain text from one React render.

## Packages

- `chakra-email` - main package for current Chakra UI v3-style token objects.
- `@chakra-email/chakra-v2` - adapter for Chakra UI v2-style theme objects.
- `@chakra-email/core` - shared implementation for adapter authors and custom tooling.
- `@chakra-email/preview` - local template discovery, live rendering, and browser preview tooling.
- `@chakra-email/react-email` - optional React Email renderer integration for preview and export tooling.
- `@chakra-email/code-block` - optional recipe-driven code blocks with a pluggable highlighter.
- `@chakra-email/markdown` - optional GFM rendering through email-safe Chakra components.

Most applications should start with `chakra-email`.

## Docs

- [Documentation site](docs/site.md)
- [Getting started](docs/getting-started.md)
- [Components](docs/components.md)
- [Theming](docs/theming.md)
- [Markdown](docs/markdown.md)
- [Rendering](docs/rendering.md)
- [Email preview](docs/preview.md)
- [Chakra UI v2](docs/chakra-v2.md)
- [Package architecture](docs/package-architecture.md)
- [Email-client test matrix](docs/email-client-test-matrix.md)

## Examples

- [Basic email](examples/basic)
- [Markdown body](examples/markdown-body)
- [Chakra UI v2 adapter](examples/chakra-v2)
- [Preview workspace](examples/preview)
- [Copyable transactional patterns](examples/patterns)

## Agent skill

The repository publishes a portable
[`compose-chakra-email`](skills/compose-chakra-email) skill for agents that are
composing, theming, previewing, rendering, migrating, or troubleshooting Chakra
Email templates. Install it from this repository with a compatible Agent Skills
client, or ask Codex's `$skill-installer` to install the skill from its GitHub
directory.

## FAQ

### Is this Chakra UI for email?

It uses a Chakra-style prop and theme model, but it renders email-safe HTML. Browser-focused layout features such as flexbox and interactive UI patterns should not be assumed to work in email clients.

### How does this relate to React Email?

It has a similar React-first email workflow, but the component styling model is Chakra-oriented and theme-token aware. `@chakra-email/preview` provides the corresponding local template browser without coupling the tool to Nx.

### Can I render a whole email body from markdown?

Yes. Map markdown nodes to the markdown-body primitives listed above, then wrap the result with your normal email header, footer, and layout components.

### Why is rendering included in `@chakra-email/core`?

The renderer is shared by the public packages and exposed as a subpath. A standalone renderer package can be added later if render-only use cases become common.

## Help and contributing

- [Report a bug or request a feature](https://github.com/chakra-email/chakra-email/issues)
- [Read the contribution guidelines](CONTRIBUTING.md)
- [Report a vulnerability privately](SECURITY.md)
- [Review release notes](CHANGELOG.md)

## Development

```bash
npm install
npm run site:dev
npm run email:dev
npm run check
npm exec nx -- run chakra-email-monorepo:yalc-publish
```

`npm run check` is the canonical release gate. It audits dependencies, lints,
runs coverage tests, performs a clean build and typecheck, compiles the examples,
inspects package contents, and installs the resulting tarballs in a clean React
18 consumer for runtime and declaration checks.

## License

[MIT](LICENSE)

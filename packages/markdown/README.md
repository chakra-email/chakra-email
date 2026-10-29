# @chakra-email/markdown

Email-safe Markdown rendering for Chakra Email. GitHub Flavored Markdown is enabled by default, including tables, task lists, strikethrough, and autolinks.

[Documentation](https://chakra.email/docs/markdown) · [Getting started](https://chakra.email/docs/getting-started) · [Examples](https://chakra.email/examples) · [Issues](https://github.com/chakra-email/chakra-email/issues)

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

## Install

```bash
npm install @chakra-email/markdown chakra-email react react-dom
```

This example uses `chakra-email` for the document shell and renderer. Chakra UI
itself is not required.

> [!NOTE]
> ESM-only. Published packages support React 18/19 and Node.js 20.19.0 or newer;
> Node.js 24 is recommended. This repository's contributor tooling uses Node.js
> 24 and pnpm.

## Quick start

Render a Markdown document to HTML and plain text, ready to pass to your email
delivery provider:

<!-- quickstart:start -->

```tsx
import { Markdown } from '@chakra-email/markdown';
import { Body, Head, Html, renderEmail } from 'chakra-email';

export async function renderWelcomeEmail() {
  return renderEmail(
    <Html>
      <Head>
        <title>Your workspace is ready</title>
      </Head>
      <Body>
        <Markdown>{`# Welcome, Ada

Your workspace is ready. [Open your dashboard](https://example.com/dashboard).

- Invite your team
- Start your first project`}</Markdown>
      </Body>
    </Html>,
  );
}
```

<!-- quickstart:end -->

Call `await renderWelcomeEmail()` to receive `{ html, text }`. Rendering does not
send mail or require provider credentials.

## Customize Markdown

```tsx
<Markdown codeBlockLineNumbers>{markdownSource}</Markdown>
```

The default component map uses Chakra Email headings, text, links, images, lists, tables, quotes, inline code, and `@chakra-email/code-block` for fenced code with a language. Pass `components` to override individual nodes and `remarkPlugins` to extend parsing.

Customize `root`, `heading`, `paragraph`, `link`, `blockquote`, `list`, `listItem`, `code`, `pre`, `hr`, `table`, `tableHeader`, `tableCell`, and `image` through the `chakraEmailMarkdown` slot recipe.

Relative URLs are intentionally omitted from delivered email markup. Resolve content URLs against a public base before rendering.

## Bounded untrusted input

Admission controls are opt-in so trusted, existing templates are not assigned
an arbitrary content ceiling. Use the strict preset for tenant-authored input:

```tsx
<Markdown limits="strict">{markdownSource}</Markdown>
```

The strict preset allows at most 256 KiB of UTF-8 source, 10,000 lines, 5,000
AST nodes, and eight levels of syntax-tree nesting. Pass a `limits` object to
set only the boundaries your application needs. Final HTML and text limits are
configured separately on `renderEmail`.

## Safe directives

Add controlled constructs without enabling MDX or executing source code:

```tsx
import { Button, Section } from 'chakra-email';

<Markdown
  directives={{
    button: {
      kind: 'leaf',
      children: 'required',
      attributes: {
        href: { type: 'url', required: true },
        variant: { type: 'enum', values: ['primary', 'secondary'] },
      },
      render: ({ attributes, children }) => (
        <Button href={String(attributes.href)}>{children}</Button>
      ),
    },
    callout: {
      kind: 'container',
      children: 'required',
      attributes: {
        tone: { type: 'enum', values: ['info', 'warning'] },
      },
      render: ({ children }) => <Section>{children}</Section>,
    },
  }}
>
  {markdownSource}
</Markdown>;
```

The content may then use
`::button[Review]{href="https://example.com" variant="primary"}` or a
`:::callout{tone="warning"}` container. The registry is trusted application
code. Source directives are inert without it; unknown directives, attributes,
invalid enums, unsafe URLs, and invalid child shapes fail closed. String
attributes require an explicit UTF-8 byte limit.

## Help and contributing

Read the [Markdown guide](https://chakra.email/docs/markdown), [open an issue](https://github.com/chakra-email/chakra-email/issues), or see the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## License

MIT

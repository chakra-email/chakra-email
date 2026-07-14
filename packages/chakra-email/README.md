# chakra-email

[![npm](https://img.shields.io/npm/v/chakra-email?style=flat-square)](https://www.pkgstats.com/pkg:chakra-email)
[![NPM](https://img.shields.io/npm/l/chakra-email?style=flat-square)](https://github.com/ryanhefner/chakra-email/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/dt/chakra-email?style=flat-square)](https://www.pkgstats.com/pkg:chakra-email)

React email components with Chakra-style props, theme tokens, markdown-body primitives, and email-safe rendering.

This is the main package for current Chakra UI v3-style token objects. It re-exports shared components and render utilities from `@chakra-email/core`.

## Install

```bash
npm install chakra-email react react-dom
```

> [!NOTE]
> `chakra-email` is ESM-only (no CommonJS build). Use `import`, or Node.js 20.19+ where `require()` of ESM modules is supported. Node.js 20.19.0 or newer is required.

## Quick Start

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

const html = await render(
  <ChakraEmailProvider theme={theme}>
    <Html lang="en">
      <Head />
      <Preview>Your Acme account is ready.</Preview>
      <Body bg="gray.50">
        <Container bg="white" p={6} maxW="600px">
          <Heading as="h1" fontSize="2xl" mb={4}>
            Welcome!
          </Heading>
          <Text color="gray.700" mb={6}>
            Thanks for joining us.
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
```

## Markdown-Friendly Components

Use these primitives when mapping markdown nodes into an email body:

- `Text`, `Heading`, `Link`
- `List`, `ListItem`
- `Blockquote`, `Code`, `Pre`, `Hr`
- `Img`
- `Table`, `TableHead`, `TableBody`, `TableFoot`, `TableRow`, `TableHeader`, `TableCell`, `TableCaption`

Keep raw HTML disabled in your markdown parser unless you sanitize it first.

## Components

- Document: `Html`, `Head`, `Preview`, `Body`
- Layout: `Container`, `Section`, `Row`, `Column`, `Box`, `Stack`, `Spacer`
- Text: `Text`, `Heading`, `Link`, `Badge`
- Markdown blocks: `Blockquote`, `Code`, `Pre`, `Hr`
- Lists and tables: `List`, `ListItem`, `Table`, `TableHead`, `TableBody`, `TableFoot`, `TableRow`, `TableHeader`, `TableCell`, `TableCaption`
- Media and actions: `Img`, `Button`

## Render Utilities

- `render(element, options)` converts React email components to HTML.
- `renderPlainText(element)` renders plain text directly from a React email.
- `pretty(html)` formats generated HTML for debugging.
- `toPlainText(html)` creates a plain-text approximation from rendered HTML.

## Related Packages

- `@chakra-email/chakra-v2` supports legacy Chakra UI v2-style flat theme scales.
- `@chakra-email/core` contains the shared primitives, renderer, theme resolver, and tests.

## More Docs

- [Getting started](https://github.com/ryanhefner/chakra-email/blob/main/docs/getting-started.md)
- [Components](https://github.com/ryanhefner/chakra-email/blob/main/docs/components.md)
- [Markdown](https://github.com/ryanhefner/chakra-email/blob/main/docs/markdown.md)
- [Theming](https://github.com/ryanhefner/chakra-email/blob/main/docs/theming.md)

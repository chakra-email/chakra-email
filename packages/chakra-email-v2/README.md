# @chakra-email/chakra-v2

React email components that reuse existing Chakra UI v2-style theme scales.

[Documentation](https://chakra.email/docs/chakra-v2) · [Getting started](https://chakra.email/docs/getting-started) · [Examples](https://chakra.email/examples) · [Issues](https://github.com/chakra-email/chakra-email/issues)

[![npm](https://img.shields.io/npm/v/%40chakra-email%2Fchakra-v2?style=flat-square)](https://www.npmjs.com/package/@chakra-email/chakra-v2)
[![NPM](https://img.shields.io/npm/l/%40chakra-email%2Fchakra-v2?style=flat-square)](https://github.com/chakra-email/chakra-email/blob/main/LICENSE)

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Use this adapter if you already have a v2 theme with flat `colors`, `space`, `fonts`, and other scales. For a new project, start with [`chakra-email`](https://chakra.email/docs/getting-started). Neither package requires `@chakra-ui/react` for ordinary email rendering.

## Install

```bash
npm install @chakra-email/chakra-v2 react react-dom
```

React 18 and 19 are supported. Packages are ESM-only: use `import` in an ESM-capable server or build tool. Node.js 24 is recommended; the published engine compatibility floor remains Node.js 20.19.

## Quick start

Save this as `src/emails/welcome.email.tsx`. This complete example uses a plain v2-style theme object; replace it with your existing theme when ready.

<!-- quickstart:start -->

```tsx
import {
  Body,
  Button,
  ChakraEmailV2Provider,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  renderEmail,
} from '@chakra-email/chakra-v2';

const chakraV2Theme = {
  colors: { brand: { 500: '#6366f1' } },
};

export default function WelcomeEmail() {
  return (
    <ChakraEmailV2Provider theme={chakraV2Theme}>
      <Html lang="en">
        <Head>
          <title>Welcome to Acme</title>
        </Head>
        <Preview>Your Acme account is ready.</Preview>
        <Body bg="gray.50">
          <Container bg="white" p={6} maxW="600px">
            <Heading as="h1">Welcome!</Heading>
            <Text>Your existing theme can style your email, too.</Text>
            <Button
              href="https://example.com/get-started"
              bg="brand.500"
              color="white"
            >
              Get started
            </Button>
          </Container>
        </Body>
      </Html>
    </ChakraEmailV2Provider>
  );
}

export async function renderWelcomeEmail() {
  const { html, text } = await renderEmail(<WelcomeEmail />);
  return { html, text };
}
```

<!-- quickstart:end -->

Call `renderWelcomeEmail()` in your server-side send handler and pass `html` and `text` to any email delivery provider. The package renders messages; it does not send them.

To preview the default-exported template, install `@chakra-email/preview` as a development dependency and follow the [preview setup](https://chakra.email/docs/preview). There is no need to install `chakra-email` alongside this adapter.

## What the adapter converts

`ChakraEmailV2Provider` and `createChakraV2EmailTheme` adapt a plain v2 theme or existing `extendTheme` output into email-safe tokens:

- **`rem`/`em` → `px`** at a 16px root font size across length scales, including composite border strings. Unitless values such as numeric line heights stay unchanged. Relative units are not dependable in clients such as Outlook desktop.
- **v2 semantic tokens** preserve `default` and `_dark`, including aliases. The default renderer keeps light styles inline and adds dark CSS as progressive enhancement; provider or render `colorMode` can force inline light or dark output. Other conditions are unsupported. See [light and dark email colors](https://chakra.email/docs/theming#light-and-dark-email-colors).
- **Browser-oriented v2 keys are dropped**: `components`, `styles`, `config`, `breakpoints`, `transition`, and `zIndices` do not apply to email output. Use Chakra Email's exported `recipes` and `slotRecipes` instead of legacy v2 component configurations.

The shared renderer and components come from `@chakra-email/core` and are re-exported here. The focused `@chakra-email/chakra-v2/security` entry point exposes strict URL policies, typed rendering errors, and final HTML/text byte limits.

## Safety and next steps

Email is not a browser layout target: test representative email clients. Use absolute public URLs for links and images, or valid `cid:` image attachments. Keep raw HTML in Markdown disabled unless it has been sanitized, and keep sending credentials on the server.

- [Chakra UI v2 guide](https://chakra.email/docs/chakra-v2)
- [Components](https://chakra.email/docs/components) and [theming](https://chakra.email/docs/theming)
- [Rendering and safety](https://chakra.email/docs/rendering)
- [Markdown bodies](https://chakra.email/docs/markdown)

## Help and contributing

[Open an issue](https://github.com/chakra-email/chakra-email/issues) or read the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## License

MIT

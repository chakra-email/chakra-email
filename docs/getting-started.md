# Getting Started

Write React email templates with Chakra-style props and render matching HTML and plain text. Most applications should install `chakra-email`; no Chakra UI installation or custom theme is needed.

## Install

```bash
npm install chakra-email react react-dom
```

React 18 and 19 are supported. Packages are ESM-only: use `import` in an ESM-capable server or build tool. Node.js 24 is recommended; the published engine compatibility floor remains Node.js 20.19.

Already have a Chakra UI v2 theme? Use the [v2 adapter](chakra-v2.md) instead.

## Create an email

Save this as `src/emails/welcome.email.tsx`:

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

The default export is the template component. Keeping rendering in a separate named function also lets the local preview discover the same template.

## Render HTML and plain text

Call `renderWelcomeEmail()` from the example in your server-side send handler. It returns `{ html, text }` from one React render. Pass both to the corresponding fields in your email provider's send API.

Chakra Email does not deliver messages or require a specific sending service. Keep provider credentials on the server. If you need only one format, use `render()` for HTML or `renderPlainText()` for text; see [rendering](rendering.md).

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

## Customize your theme

The built-in theme works immediately. When you are ready, pass a plain theme object to `ChakraEmailProvider`, or adapt an existing Chakra UI `createSystem()` result. You only need Chakra UI installed if you choose its utilities. See [theming](theming.md) for tokens, recipes, and light/dark rendering.

## Before sending

Use deliberate absolute public URLs for images and links, or valid `cid:` image attachments. Relative URLs are omitted instead of being guessed. Do not enable raw HTML in a Markdown parser unless you sanitize it first. Test representative email clients: browser-only layouts and interactions are not portable to email.

## Next steps

- Explore [components](components.md) and [examples](https://chakra.email/examples).
- Add [Markdown bodies](markdown.md) or [code blocks](code-block.md).
- Review [rendering and safety](rendering.md).
- Choose optional adapters and tools in [package architecture](package-architecture.md).
- [Open an issue](https://github.com/chakra-email/chakra-email/issues) if you get stuck.

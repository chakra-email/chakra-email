# Getting Started

`chakra-email` lets you write React email templates with Chakra-style props and theme tokens, then render them to static HTML.

## Install

```bash
npm install chakra-email react react-dom
```

## Create An Email

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

export function WelcomeEmail() {
  return (
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
    </ChakraEmailProvider>
  );
}
```

## Render HTML

```tsx
import { render, renderPlainText } from 'chakra-email';
import { WelcomeEmail } from './WelcomeEmail';

const html = await render(<WelcomeEmail />, { pretty: true });
const text = await renderPlainText(<WelcomeEmail />);
```

Pass `html` and `text` to your email delivery provider.

## Next Steps

- Read [components](components.md) for the primitive catalog.
- Read [theming](theming.md) for token resolution.
- Read [markdown](markdown.md) if your email body comes from markdown.
- Read [rendering](rendering.md) for HTML and plain-text output details.

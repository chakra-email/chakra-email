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
  renderPlainText,
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

function WelcomeEmail() {
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

export async function renderWelcomeEmail() {
  return {
    html: await render(<WelcomeEmail />, { pretty: true }),
    text: await renderPlainText(<WelcomeEmail />),
  };
}

import { describe, expect, it } from 'vitest';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  ThemeProvider,
  render,
  toPlainText,
} from '../index';

function WelcomeEmail() {
  return (
    <ThemeProvider>
      <Html>
        <Head>
          <title>Welcome email</title>
        </Head>
        <Preview>You are in!</Preview>
        <Body bg="gray.50">
          <Container bg="white" p={6} maxW="600px">
            <Heading as="h1" fontSize="2xl" fontWeight="bold" mb={4}>
              Welcome!
            </Heading>
            <Text fontSize="md" color="gray.700" mb={6}>
              Thanks for joining us.
            </Text>
            <Button href="https://example.com/get-started" bg="brand.500" color="white">
              Get Started
            </Button>
          </Container>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

describe('render', () => {
  it('renders an email-safe HTML document', async () => {
    const html = await render(<WelcomeEmail />);

    expect(html).toContain('<!DOCTYPE html PUBLIC');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('background-color:#F7FAFC');
    expect(html).toContain('background-color:#6366f1');
    expect(html).toContain('font-size:24px');
    expect(html).toContain('font-weight:700');
    expect(html).toContain('href="https://example.com/get-started"');
  });

  it('can produce plain text from rendered HTML', async () => {
    const html = await render(<WelcomeEmail />);
    const text = toPlainText(html);

    expect(text).toContain('Get Started [https://example.com/get-started]');
    expect(text).not.toContain('Welcome email');
    expect(text).not.toContain('You are in!');
  });
});

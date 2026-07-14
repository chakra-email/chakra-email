import { describe, expect, it } from 'vitest';
import { version as reactVersion } from 'react';
import {
  Blockquote,
  Body,
  Button,
  Code,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  List,
  ListItem,
  Pre,
  Preview,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '../components';
import { ThemeProvider } from '../theme';
import { render, renderPlainText } from './render';

const brandTheme = {
  tokens: {
    colors: {
      brand: {
        500: { value: '#2563eb' },
        600: { value: '#1d4ed8' },
      },
    },
  },
};

function WelcomeEmail() {
  return (
    <ThemeProvider theme={brandTheme}>
      <Html lang="en">
        <Head>
          <title>Welcome to Acme</title>
        </Head>
        <Preview>Your Acme account is ready.</Preview>
        <Body bg="gray.50">
          <Container bg="white" p={6} maxW="600px">
            <Img
              src="https://example.com/logo.png"
              alt="Acme logo"
              width={120}
              height={40}
              mb={6}
            />
            <Heading as="h1" fontSize="2xl" fontWeight="bold" mb={4}>
              Welcome!
            </Heading>
            <Text fontSize="md" color="gray.700" mb={6}>
              Thanks for joining us. Your account is ready.
            </Text>
            <Button href="https://example.com/get-started" bg="brand.500" color="white">
              Get Started
            </Button>
            <Hr my={6} />
            <Text fontSize="sm" color="gray.500">
              Questions? Visit our <Link href="https://example.com/help">help center</Link>.
            </Text>
          </Container>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

function ReleaseNotesEmail() {
  return (
    <ThemeProvider theme={brandTheme}>
      <Html lang="en">
        <Head>
          <title>Release notes</title>
        </Head>
        <Preview>What changed in version 2.0.</Preview>
        <Body bg="white">
          <Container p={6} maxW="600px">
            <Heading as="h1" fontSize="xl" mb={4}>
              Release notes
            </Heading>
            <Text mb={4}>Highlights from this release:</Text>
            <List>
              <ListItem>Faster rendering pipeline</ListItem>
              <ListItem>
                New <Code>render()</Code> options
              </ListItem>
              <ListItem>Improved plain-text output</ListItem>
            </List>
            <List as="ol">
              <ListItem>Upgrade the package</ListItem>
              <ListItem>Run your test suite</ListItem>
            </List>
            <Blockquote>
              Email rendering should be boring and predictable.
            </Blockquote>
            <Pre>{'npm install chakra-email@latest\nnpm test'}</Pre>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Feature</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Pretty output</TableCell>
                  <TableCell>Stable</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Plain text</TableCell>
                  <TableCell>Stable</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Container>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

// The HTML snapshots are generated against React 19, which hoists image
// preload links and reorders <head> metadata compared to React 18. Both
// outputs are valid email HTML, so the HTML snapshots only run on React 19
// (the version CI generates them with); the plain-text snapshots are
// identical on both and always run.
const isReact19 = reactVersion.startsWith('19.');

describe('golden output snapshots', () => {
  it.runIf(isReact19)('welcome email pretty HTML', async () => {
    const html = await render(<WelcomeEmail />, { pretty: true });
    expect(html).toMatchSnapshot();
  });

  it('welcome email plain text', async () => {
    const text = await renderPlainText(<WelcomeEmail />);
    expect(text).toMatchSnapshot();
  });

  it.runIf(isReact19)('release notes email pretty HTML', async () => {
    const html = await render(<ReleaseNotesEmail />, { pretty: true });
    expect(html).toMatchSnapshot();
  });

  it('release notes email plain text', async () => {
    const text = await renderPlainText(<ReleaseNotesEmail />);
    expect(text).toMatchSnapshot();
  });
});

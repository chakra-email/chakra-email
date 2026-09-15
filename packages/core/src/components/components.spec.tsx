import { describe, expect, it } from 'vitest';
import {
  Badge,
  Blockquote,
  Body,
  Box,
  Button,
  Code,
  Column,
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
  resolveBorderColor,
  Row,
  Section,
  Spacer,
  Stack,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFoot,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from './index';
import { render } from '../render';
import {
  chakraEmailRecipeKeys,
  chakraEmailSlotRecipeKeys,
  ThemeProvider,
} from '../theme';

describe('email components', () => {
  it('applies component recipe overrides from the email theme', async () => {
    const html = await render(
      <ThemeProvider
        theme={{
          recipes: {
            [chakraEmailRecipeKeys.badge]: {
              base: {
                bg: '#123456',
                color: '#ffffff',
                textTransform: 'none',
              },
            },
            [chakraEmailRecipeKeys.heading]: {
              variants: {
                level: {
                  h2: { color: '#654321', fontSize: '4xl' },
                },
              },
            },
          },
        }}
      >
        <Badge>Recipe badge</Badge>
        <Heading as="h2">Recipe heading</Heading>
      </ThemeProvider>,
    );

    expect(html).toContain('background-color:#123456');
    expect(html).toContain('text-transform:none');
    expect(html).toContain('color:#654321');
    expect(html).toContain('font-size:36px');
  });

  it('applies multipart recipe overrides and propagates table variants', async () => {
    const html = await render(
      <ThemeProvider
        theme={{
          slotRecipes: {
            [chakraEmailSlotRecipeKeys.button]: {
              slots: ['root', 'cell', 'link'],
              variants: {
                variant: {
                  solid: {
                    cell: { bg: '#123456' },
                    link: { color: '#ffffff' },
                  },
                },
              },
            },
            [chakraEmailSlotRecipeKeys.container]: {
              slots: ['root', 'cell'],
              base: { cell: { p: 1 } },
            },
            [chakraEmailSlotRecipeKeys.table]: {
              slots: [
                'root',
                'header',
                'body',
                'footer',
                'row',
                'columnHeader',
                'cell',
                'caption',
              ],
              variants: {
                size: {
                  compact: {
                    columnHeader: { p: 1 },
                    cell: { p: 1 },
                  },
                },
              },
            },
          },
        }}
      >
        <Container>
          <Button href="https://example.com">Recipe button</Button>
          <Table size="compact">
            <TableBody>
              <TableRow>
                <TableHeader>Header</TableHeader>
                <TableCell>Cell</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Container>
      </ThemeProvider>,
    );

    expect(html).toContain('background-color:#123456');
    expect(html).toContain('<td style="padding:4px">');
    expect(html.match(/padding:4px/g)).toHaveLength(3);
  });

  it('renders the common document, layout, media, and text primitives', async () => {
    const html = await render(
      <ThemeProvider>
        <Html lang="fr">
          <Head>
            <title>Component smoke</title>
          </Head>
          <Preview>Preview copy</Preview>
          <Body bg="gray.50">
            <Container id="container" bg="white" p={6} maxW="600px">
              <Section p={2}>
                <table role="presentation" cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <Row>
                      <Column width="50%" align="center">
                        <Box as="span" color="gray.700">
                          Box copy
                        </Box>
                      </Column>
                      <Column width="50%">
                        <Img
                          src="https://example.com/logo.png"
                          alt="Logo"
                          width={120}
                        />
                      </Column>
                    </Row>
                  </tbody>
                </table>
              </Section>
              <Heading as="h2">Heading copy</Heading>
              <Text as="span">Inline text</Text>
              <Link href="https://example.com/docs">Docs</Link>
              <Hr />
              <Badge>New</Badge>
              <List>
                <ListItem>First</ListItem>
                <ListItem>Second</ListItem>
              </List>
              <Stack spacing={2} divider={<Hr />}>
                <Text>Top</Text>
                <Text>Bottom</Text>
              </Stack>
              <Spacer size={3} />
            </Container>
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('<title>Component smoke</title>');
    expect(html).toContain('Preview copy');
    expect(html).toContain('id="container"');
    expect(html).toContain('Box copy');
    expect(html).toContain('src="https://example.com/logo.png"');
    expect(html).toContain('alt="Logo"');
    expect(html).toContain('width="120"');
    expect(html).toContain('<h2');
    expect(html).toContain('Inline text');
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('<hr');
    expect(html).toContain('New');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('Top');
    expect(html).toContain('Bottom');
    expect(html).toContain('height:12px');
  });

  it('resolves Stack spacing and Spacer size through the space scale', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Stack spacing={4}>
              <Text>First</Text>
              <Text>Second</Text>
            </Stack>
            <Spacer size={3} />
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain('height:16px');
    expect(html).toContain('height:12px');
    expect(html).not.toContain('height:4px');
    expect(html).not.toContain('height:3px');
  });

  it('renders button variants, sizes, and alignment attributes', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Button href="https://example.com/solid" size="sm" align="center">
              Solid
            </Button>
            <Button
              href="https://example.com/outline"
              variant="outline"
              borderColor="brand.500"
            >
              Outline
            </Button>
            <Button href="https://example.com/ghost" variant="ghost" size="lg">
              Ghost
            </Button>
            <Button href="https://example.com/link" variant="link">
              Link
            </Button>
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain('align="center"');
    expect(html).toContain('href="https://example.com/solid"');
    expect(html).toContain('font-size:14px');
    expect(html).toContain('href="https://example.com/outline"');
    expect(html).toContain('border:1px solid #6366f1');
    expect(html).toContain('href="https://example.com/ghost"');
    expect(html).toContain('font-size:18px');
    expect(html).toContain('href="https://example.com/link"');
    expect(html).toContain('text-decoration:underline');
  });

  it('applies button margins to the wrapper table only', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Button href="https://example.com" mb={4}>
              Margin
            </Button>
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html.match(/margin-bottom:16px/g)).toHaveLength(1);
  });

  it('omits unsafe href protocols from links and buttons', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Link href="javascript:alert(1)">Script link</Link>
            <Link href={'\n JaVaScRiPt:alert(1)'}>Sneaky link</Link>
            <Link href="vbscript:MsgBox(1)">Vbscript link</Link>
            <Link href="data:text/html,payload">Data link</Link>
            <Link href="data:image/png;base64,AAAA">Image data link</Link>
            <Link href="data:image/svg+xml,&lt;svg/&gt;">SVG data link</Link>
            <Link href="ftp://example.com/file">FTP link</Link>
            <Button href="javascript:alert(1)">Script button</Button>
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('JaVaScRiPt:');
    expect(html).not.toContain('vbscript:');
    expect(html).not.toContain('data:text/html');
    expect(html).not.toContain('data:image/');
    expect(html).not.toContain('ftp://');
    expect(html).not.toContain('href=');
  });

  it('keeps portable hrefs and omits relative email URLs', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Link href="https://example.com/docs">Https</Link>
            <Link href="http://example.com">Http</Link>
            <Link href="mailto:hi@example.com">Mailto</Link>
            <Link href="tel:+15555550123">Tel</Link>
            <Link href="#section">Anchor</Link>
            <Link href="/relative/path">Relative</Link>
            <Button href="https://example.com/cta">Button</Button>
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('href="http://example.com"');
    expect(html).toContain('href="mailto:hi@example.com"');
    expect(html).toContain('href="tel:+15555550123"');
    expect(html).toContain('href="#section"');
    expect(html).not.toContain('href="/relative/path"');
    expect(html).toContain('href="https://example.com/cta"');
  });

  it('renders markdown body primitives with email-safe inline styles', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Container>
              <Heading as="h1">Markdown title</Heading>
              <Text>
                Paragraph with <Code>inlineCode()</Code> and{' '}
                <Link href="https://example.com">a link</Link>.
              </Text>
              <Blockquote>
                <Text>Quoted copy</Text>
              </Blockquote>
              <Pre>
                <Code>{'const value = "email";'}</Code>
              </Pre>
              <Table>
                <TableCaption>Release table</TableCaption>
                <TableHead>
                  <TableRow>
                    <TableHeader scope="col">Package</TableHeader>
                    <TableHeader scope="col">Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>chakra-email</TableCell>
                    <TableCell>ready</TableCell>
                  </TableRow>
                </TableBody>
                <TableFoot>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell>1</TableCell>
                  </TableRow>
                </TableFoot>
              </Table>
            </Container>
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain('<blockquote');
    expect(html).toContain('border-left:4px solid #E2E8F0');
    expect(html).toContain('<code');
    expect(html).toContain(
      'font-family:Menlo, Monaco, Consolas, &quot;Courier New&quot;, monospace',
    );
    expect(html).toContain('<pre');
    expect(html).toContain('white-space:pre-wrap');
    expect(html).toContain('<table');
    expect(html).toContain('border-collapse:collapse');
    expect(html).toContain('<caption');
    expect(html).toContain('<thead');
    expect(html).toContain('<tbody');
    expect(html).toContain('<tfoot');
    expect(html).toContain('<th');
    expect(html).toContain('scope="col"');
    expect(html).toContain('<td');
    expect(html).toContain('Package');
    expect(html).toContain('Total');
    expect(html).toContain('ready');
  });

  it('resolves default border colors through the semantic border token', async () => {
    const html = await render(
      <ThemeProvider theme={{ colors: { gray: { 200: '#ff00aa' } } }}>
        <Html>
          <Body>
            <Hr />
            <Blockquote>
              <Text>Quoted copy</Text>
            </Blockquote>
            <Table>
              <TableBody>
                <TableRow>
                  <TableHeader>Head</TableHeader>
                  <TableCell>Cell</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Body>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain('border-top:1px solid #ff00aa');
    expect(html).toContain('border-left:4px solid #ff00aa');
    expect(html.match(/border:1px solid #ff00aa/g)).toHaveLength(2);
    expect(html).not.toContain('#E2E8F0');
  });

  it('falls back to #E2E8F0 only when the semantic border token is missing', () => {
    expect(resolveBorderColor(undefined, {})).toBe('#E2E8F0');
    expect(
      resolveBorderColor(undefined, {
        semanticTokens: { colors: { border: { value: '#123456' } } },
      }),
    ).toBe('#123456');
    expect(
      resolveBorderColor('brand.500', {
        colors: { brand: { 500: '#6366f1' } },
      }),
    ).toBe('#6366f1');
    expect(resolveBorderColor('#0000ff', {})).toBe('#0000ff');
  });

  it('renders non-string preview content', async () => {
    const html = await render(
      <Html>
        <Body>
          <Preview>
            <span>Hidden</span>
          </Preview>
          <Text>Visible</Text>
        </Body>
      </Html>,
    );

    expect(html).toContain('Hidden');
    expect(html).toContain('Visible');
  });
});

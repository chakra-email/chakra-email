import type { CSSProperties } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
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
import { ThemeProvider } from '../theme';

/**
 * Mirrors UNSAFE_STYLE_PROPS in ../system/email-safe.ts (the set is not
 * exported). If a property is added there, add its kebab-cased form here so
 * the whole-document sweep keeps guarding it.
 */
const unsafeCssProperties = [
  'animation',
  'backdrop-filter',
  'box-shadow',
  'filter',
  'position',
  'transform',
  'transition',
  'z-index',
];

/**
 * Aggressive style payload passed to every component. Everything except
 * textShadow is in email-safe.ts's unsafe list and must be stripped from the
 * output. textShadow is intentionally NOT in that list today, so it is
 * allowed through; it is included here to pin that only listed properties are
 * removed.
 */
const unsafeStyle: CSSProperties = {
  animation: 'spin 1s linear infinite',
  backdropFilter: 'blur(4px)',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
  filter: 'grayscale(1)',
  position: 'absolute',
  transform: 'rotate(3deg)',
  transition: 'all 0.3s ease-in-out',
  zIndex: 999,
  textShadow: '1px 1px 2px #000000',
};

const unsafe = { style: unsafeStyle } as const;

function SweepEmail() {
  return (
    <ThemeProvider>
      <Html {...unsafe}>
        <Head>
          <title>Email-safe sweep</title>
        </Head>
        <Preview>Sweep preview copy</Preview>
        <Body bg="gray.50" {...unsafe}>
          <Container bg="white" p="1.5rem" {...unsafe}>
            <Section bg="gray.100" display="grid" {...unsafe}>
              <table role="presentation" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <Row {...unsafe}>
                    <Column width="50%" display="flex" {...unsafe}>
                      <Box
                        display="flex"
                        w="30rem"
                        style={{ ...unsafeStyle, gap: '8px' }}
                      >
                        Box copy
                      </Box>
                      <Img
                        src="https://example.com/logo.png"
                        alt="Logo"
                        width={120}
                        {...unsafe}
                      />
                    </Column>
                  </Row>
                </tbody>
              </table>
            </Section>
            <Heading as="h2" fontSize="1.75rem" {...unsafe}>
              Heading copy
            </Heading>
            <Text display="grid" {...unsafe}>
              Body copy
            </Text>
            <Link href="https://example.com/docs" {...unsafe}>
              Docs
            </Link>
            <Hr {...unsafe} />
            <Badge {...unsafe}>New</Badge>
            <Code {...unsafe}>inlineCode()</Code>
            <Pre {...unsafe}>preformatted</Pre>
            <Blockquote {...unsafe}>
              <Text>Quoted copy</Text>
            </Blockquote>
            <List {...unsafe}>
              <ListItem {...unsafe}>First</ListItem>
            </List>
            <Stack spacing={2} {...unsafe}>
              <Text>Top</Text>
              <Text>Bottom</Text>
            </Stack>
            <Spacer size={3} {...unsafe} />
            <Button href="https://example.com/cta" bg="gray.800" {...unsafe}>
              Call to action
            </Button>
            <Table data-testid="data-table" {...unsafe}>
              <TableCaption {...unsafe}>Release table</TableCaption>
              <TableHead {...unsafe}>
                <TableRow {...unsafe}>
                  <TableHeader scope="col" {...unsafe}>
                    Package
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody {...unsafe}>
                <TableRow>
                  <TableCell {...unsafe}>chakra-email</TableCell>
                </TableRow>
              </TableBody>
              <TableFoot {...unsafe}>
                <TableRow>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableFoot>
            </Table>
          </Container>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

describe('email-safe output sweep', () => {
  let html: string;

  beforeAll(async () => {
    html = await render(<SweepEmail />);
  });

  it('renders every component in the document', () => {
    expect(html).toContain('<title>Email-safe sweep</title>');
    expect(html).toContain('Sweep preview copy');
    expect(html).toContain('Box copy');
    expect(html).toContain('src="https://example.com/logo.png"');
    expect(html).toContain('Heading copy');
    expect(html).toContain('Body copy');
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('<hr');
    expect(html).toContain('New');
    expect(html).toContain('inlineCode()');
    expect(html).toContain('preformatted');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<li');
    expect(html).toContain('Top');
    expect(html).toContain('Bottom');
    expect(html).toContain('href="https://example.com/cta"');
    expect(html).toContain('<caption');
    expect(html).toContain('<thead');
    expect(html).toContain('<tbody');
    expect(html).toContain('<tfoot');
    expect(html).toContain('chakra-email');
  });

  it('strips every property from the email-unsafe list on every component', () => {
    for (const property of unsafeCssProperties) {
      // The lookbehind keeps allowed compounds like `text-transform:` and
      // `background-position:` from matching their unsafe suffix.
      expect(html).not.toMatch(new RegExp(`(?<![-a-zA-Z])${property}\\s*:`));
    }

    // Marker values from the unsafe payload must not survive either.
    expect(html).not.toContain('spin 1s linear infinite');
    expect(html).not.toContain('blur(4px)');
    expect(html).not.toContain('rgba(0, 0, 0, 0.4)');
    expect(html).not.toContain('grayscale(1)');
    expect(html).not.toContain('absolute');
    expect(html).not.toContain('rotate(3deg)');
    expect(html).not.toContain('0.3s ease-in-out');
  });

  it('downgrades display:flex and display:grid to block everywhere', () => {
    expect(html).not.toMatch(/display\s*:\s*flex/);
    expect(html).not.toMatch(/display\s*:\s*grid/);
    // The Box that asked for flex still renders, downgraded to block.
    expect(html).toContain('display:block');
  });

  it('prefixes the XHTML 1.0 Transitional doctype', () => {
    expect(html.startsWith('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"')).toBe(
      true
    );
  });

  it('marks every layout table with role="presentation"', () => {
    const tableTags = html.match(/<table\b[^>]*>/g) ?? [];

    // Container, Section, raw layout table, Stack, Button, and the semantic
    // data Table.
    expect(tableTags.length).toBe(6);

    for (const tag of tableTags) {
      if (tag.includes('data-testid="data-table"')) {
        // The data <Table> is deliberately semantic (no presentation role).
        continue;
      }

      expect(tag).toContain('role="presentation"');
    }
  });

  it('resolves bg tokens to inline background-color styles', () => {
    expect(html).toContain('background-color:#F7FAFC');
    expect(html).toContain('background-color:#ffffff');
    expect(html).toContain('background-color:#EDF2F7');
    expect(html).toContain('background-color:#1A202C');
  });

  it('emits the legacy bgcolor fallback attribute when bg is set', () => {
    // Body, Container, Section, and Button all mirror a resolved
    // background-color into the legacy bgcolor attribute for old Outlook.
    expect(html).toContain('bgcolor="#F7FAFC"');
    expect(html).toContain('bgcolor="#ffffff"');
    expect(html).toContain('bgcolor="#EDF2F7"');
    expect(html).toContain('bgcolor="#1A202C"');
  });

  it('passes rem-valued raw strings through untouched', () => {
    expect(html).toContain('padding:1.5rem');
    expect(html).toContain('font-size:1.75rem');
    expect(html).toContain('width:30rem');
  });
});

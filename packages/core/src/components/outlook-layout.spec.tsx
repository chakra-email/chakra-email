import { describe, expect, it } from 'vitest';
import { render } from '../render';
import { ThemeProvider } from '../theme';
import {
  Body,
  Box,
  Button,
  Column,
  Container,
  Html,
  Preview,
  Row,
  Section,
  Stack,
} from './index';

function openingTags(html: string, tagName: string): string[] {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'g')) ?? [];
}

describe('Outlook-compatible layout markup', () => {
  it('places Container padding on its cell and emits a pixel width fallback', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Container bg="white" p={6} px={8} pt={2} maxW="600px">
              Content
            </Container>
          </Body>
        </Html>
      </ThemeProvider>,
    );
    const [table] = openingTags(html, 'table');
    const [cell] = openingTags(html, 'td');

    expect(table).toContain('width="600"');
    expect(table).toContain('bgcolor="#ffffff"');
    expect(table).toContain('background-color:#ffffff');
    expect(table).toContain('width:100%');
    expect(table).toContain('max-width:600px');
    expect(table).not.toContain('padding');
    expect(cell).toContain('padding:24px');
    expect(cell).toContain('padding-left:32px');
    expect(cell).toContain('padding-right:32px');
    expect(cell).toContain('padding-top:8px');
  });

  it('places Section padding on its cell and mirrors its resolved width', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Section bg="gray.100" p={4} width={320}>
              Content
            </Section>
          </Body>
        </Html>
      </ThemeProvider>,
    );
    const [table] = openingTags(html, 'table');
    const [cell] = openingTags(html, 'td');

    expect(table).toContain('width="320"');
    expect(table).toContain('bgcolor="#EDF2F7"');
    expect(table).toContain('width:320px');
    expect(table).not.toContain('padding');
    expect(cell).toContain('padding:16px');
  });

  it('adds legacy percentage and pixel widths to Column cells', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <table role="presentation">
              <tbody>
                <Row>
                  <Column width="50%">Fluid</Column>
                  <Column width={240}>Fixed</Column>
                </Row>
              </tbody>
            </table>
          </Body>
        </Html>
      </ThemeProvider>,
    );
    const [fluidColumn, fixedColumn] = openingTags(html, 'td');

    expect(fluidColumn).toContain('width="50%"');
    expect(fluidColumn).toContain('width:50%');
    expect(fixedColumn).toContain('width="240"');
    expect(fixedColumn).toContain('width:240px');
  });

  it('keeps modern button padding clickable and adds an Outlook cell fallback', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Button href="https://example.com/cta" px={7} py={2} mb={4}>
              Call to action
            </Button>
          </Body>
        </Html>
      </ThemeProvider>,
    );
    const [table] = openingTags(html, 'table');
    const [cell] = openingTags(html, 'td');
    const [anchor] = openingTags(html, 'a');

    expect(table.match(/margin-bottom:16px/g)).toHaveLength(1);
    expect(cell).toContain('bgcolor="#6366f1"');
    expect(cell).toContain('background-color:#6366f1');
    expect(cell).toContain('mso-padding-alt:8px 28px 8px 28px');
    expect(cell).not.toContain('padding-left:28px');
    expect(cell).toContain('border-radius:6px');
    expect(anchor).toContain('href="https://example.com/cta"');
    expect(anchor).toContain('color:#ffffff');
    expect(anchor).toContain('padding-left:28px');
    expect(anchor).toContain('padding-right:28px');
    expect(anchor).toContain('padding-top:8px');
    expect(anchor).toContain('padding-bottom:8px');
    expect(anchor).not.toContain('background-color');
    expect(anchor).not.toContain('margin-bottom');
  });

  it('places outline borders on the button cell and keeps link buttons unpadded', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Button href="https://example.com/outline" variant="outline">
              Outline
            </Button>
            <Button href="https://example.com/link" variant="link">
              Link
            </Button>
          </Body>
        </Html>
      </ThemeProvider>,
    );
    const [outlineCell, linkCell] = openingTags(html, 'td');
    const [outlineAnchor, linkAnchor] = openingTags(html, 'a');

    expect(outlineCell).toContain('border:1px solid #6366f1');
    expect(outlineAnchor).not.toContain('border:');
    expect(linkCell).toContain('mso-padding-alt:0 0 0 0');
    expect(linkCell).toContain('border:none');
    expect(linkAnchor).toContain('text-decoration:underline');
    expect(linkAnchor).toContain('padding:0');
  });

  it('forwards native attributes to the element represented by each primitive', async () => {
    const html = await render(
      <ThemeProvider>
        <Html>
          <Body>
            <Container aria-label="Message container">
              <Section aria-label="Message section">
                <table role="presentation">
                  <tbody>
                    <Row aria-label="Message row">
                      <Column colSpan={2} headers="message-heading">
                        Content
                      </Column>
                    </Row>
                    <Row>
                      <Box as="td" colSpan={2} headers="message-heading">
                        Polymorphic cell
                      </Box>
                    </Row>
                  </tbody>
                </table>
              </Section>
              <Stack aria-label="Message stack">
                <Button
                  href="https://example.com/cta"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open account"
                >
                  Open
                </Button>
              </Stack>
            </Container>
          </Body>
        </Html>
      </ThemeProvider>,
    );
    const tables = openingTags(html, 'table');
    const [anchor] = openingTags(html, 'a');

    expect(
      tables.some((table) => table.includes('aria-label="Message container"')),
    ).toBe(true);
    expect(
      tables.some((table) => table.includes('aria-label="Message section"')),
    ).toBe(true);
    expect(
      tables.some((table) => table.includes('aria-label="Message stack"')),
    ).toBe(true);
    expect(html).toContain('<tr aria-label="Message row">');
    expect(html.match(/colSpan="2"/g)).toHaveLength(2);
    expect(html.match(/headers="message-heading"/g)).toHaveLength(2);
    expect(anchor).toContain('target="_blank"');
    expect(anchor).toContain('rel="noopener noreferrer"');
    expect(anchor).toContain('aria-label="Open account"');
  });

  it('hides preview text from classic Outlook as well as standards-based clients', async () => {
    const html = await render(
      <Html>
        <Body>
          <Preview>Inbox preview</Preview>
        </Body>
      </Html>,
    );
    const [preview, spacer] = openingTags(html, 'div').concat(
      openingTags(html, 'span'),
    );

    expect(preview).toContain('aria-hidden="true"');
    expect(preview).toContain('display:none');
    expect(preview).toContain('visibility:hidden');
    expect(preview).toContain('opacity:0');
    expect(preview).toContain('mso-hide:all');
    expect(spacer).toContain('mso-hide:all');
  });
});

import { describe, expect, it } from 'vitest';
import {
  Blockquote,
  Body,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '../components';
import { pretty } from './pretty';
import { render, renderPlainText } from './render';
import { toPlainText } from './text';

describe('render utilities', () => {
  it('pretty-prints generated HTML when requested', async () => {
    const html = await render(
      <Html>
        <Body>
          <Text>Pretty</Text>
        </Body>
      </Html>,
      { pretty: true },
    );

    expect(html).toContain('\n<html');
    expect(html).toContain('\n<body');
  });

  it('can render plain text directly from an element', async () => {
    const text = await renderPlainText(
      <Html>
        <Body>
          <Text>
            Read <Link href="https://example.com">more</Link>.
          </Text>
        </Body>
      </Html>,
    );

    expect(text).toContain('Read more [https://example.com].');
  });

  it('supports the render plainText option', async () => {
    const text = await render(
      <Html>
        <Body>
          <Text>Plain option</Text>
        </Body>
      </Html>,
      { plainText: true },
    );

    expect(text).toBe('Plain option');
  });

  it('converts common HTML constructs to plain text', () => {
    expect(
      toPlainText(`
        <!doctype html>
        <style>.x{color:red}</style>
        <script>alert("x")</script>
        <h1>Title&nbsp;Here</h1>
        <p>Copy &amp; details<br>More</p>
        <a href="https://example.com"></a>
        <hr>
      `),
    ).toContain('Title Here');
    expect(toPlainText('<a href="https://example.com">Example</a>')).toBe(
      'Example [https://example.com]',
    );
    expect(toPlainText('<a href="https://example.com"></a>')).toBe(
      'https://example.com',
    );
  });

  it('formats a compact HTML string', () => {
    expect(pretty('<html><body><p>Hi</p></body></html>')).toBe(
      '<html>\n<body>\n<p>Hi</p>\n</body>\n</html>',
    );
  });

  it('pretty preserves whitespace-significant content inside pre and style blocks', () => {
    const code = 'const x = 1;\n\n  if (x) {\n    run();\n  }';
    const html = `<body><pre style="white-space:pre-wrap">${code}</pre><style>.a {\n  color: red;\n}</style></body>`;
    const output = pretty(html);

    expect(output).toContain(code);
    expect(output).toContain('.a {\n  color: red;\n}');
  });

  it('pretty does not insert whitespace between adjacent inline elements', () => {
    const html =
      '<p><a href="https://a.example">One</a><a href="https://b.example">Two</a><span>!</span></p>';
    const output = pretty(html);

    expect(output).toContain('</a><a');
    expect(output).toContain('</a><span>');
  });

  it('strips head content and hidden elements from plain text', () => {
    expect(
      toPlainText(
        '<html><head><title>Page title</title></head><body>' +
          '<div style="display:none">hidden<div>nested hidden</div></div>' +
          '<p>Visible</p></body></html>',
      ),
    ).toBe('Visible');
  });

  it('keeps br as a single line break and block boundaries as paragraph breaks', () => {
    expect(
      toPlainText('<p>Line one<br>Line two</p><p>Next paragraph</p>'),
    ).toBe('Line one\nLine two\n\nNext paragraph');
  });

  it('emits image alt text and separates table cells', () => {
    expect(toPlainText('<p><img src="/logo.png" alt="Logo"/></p>')).toBe(
      'Logo',
    );
    expect(
      toPlainText('<table><tr><td>One</td><td>Two</td></tr></table>'),
    ).toBe('One Two');
  });

  it('does not double-decode HTML entities', () => {
    expect(toPlainText('<p>&amp;lt;not a tag&amp;gt;</p>')).toBe(
      '&lt;not a tag&gt;',
    );
    expect(toPlainText('<p>Fish &amp; Chips</p>')).toBe('Fish & Chips');
  });

  it('pretty is idempotent for a full layout document', async () => {
    const html = await render(
      <Html>
        <Head>
          <title>Idempotence</title>
        </Head>
        <Preview>Preview text</Preview>
        <Body bg="gray.50">
          <Container bg="white" p={6}>
            <Heading as="h1">Title</Heading>
            <Text>
              Body copy with a <Link href="https://example.com">link</Link>.
            </Text>
            <Button href="https://example.com/cta">Call to action</Button>
            <Hr />
            <Img
              src="https://example.com/logo.png"
              alt="Logo"
              width={100}
              height={30}
            />
          </Container>
        </Body>
      </Html>,
    );

    const once = pretty(html);
    expect(pretty(once)).toBe(once);
  });

  it('pretty is idempotent for a markdown-primitives document', async () => {
    const html = await render(
      <Html>
        <Body>
          <List>
            <ListItem>One</ListItem>
            <ListItem>Two</ListItem>
          </List>
          <Blockquote>Quoted wisdom</Blockquote>
          <Text>
            Inline <Code>code()</Code> sample.
          </Text>
          <Pre>{'line one\nline two'}</Pre>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Key</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Body>
      </Html>,
    );

    const once = pretty(html);
    expect(pretty(once)).toBe(once);
  });

  it('separates list items with paragraph breaks in plain text', () => {
    expect(toPlainText('<ul><li>One</li><li>Two</li></ul>')).toBe('One\n\nTwo');
    expect(toPlainText('<ol><li>First</li><li>Second</li></ol>')).toBe(
      'First\n\nSecond',
    );
  });

  it('pins plain text output for every markdown primitive', async () => {
    const text = await renderPlainText(
      <Html>
        <Body>
          <List>
            <ListItem>Alpha</ListItem>
            <ListItem>Beta</ListItem>
          </List>
          <Blockquote>Quoted wisdom</Blockquote>
          <Text>
            Inline <Code>npm install</Code> sample.
          </Text>
          <Pre>{'first line\nsecond line'}</Pre>
          <Hr />
          <Link href="https://example.com/docs">Docs</Link>
          <Img src="https://example.com/logo.png" alt="Company logo" />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Feature</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Render</TableCell>
                <TableCell>Stable</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Body>
      </Html>,
    );

    // List items are separated by blank lines (no bullet characters).
    expect(text).toContain('Alpha\n\nBeta');
    // Blockquote content survives as its own paragraph.
    expect(text).toContain('Quoted wisdom');
    // Inline code is unwrapped into the surrounding sentence.
    expect(text).toContain('Inline npm install sample.');
    // Pre content is preserved, though internal whitespace is collapsed.
    expect(text).toContain('first line second line');
    // Hr becomes a --- divider on its own paragraph.
    expect(text).toContain('---');
    // Links keep their href in brackets.
    expect(text).toContain('Docs [https://example.com/docs]');
    // Images surface their alt text.
    expect(text).toContain('Company logo');
    // Table cells in the same row are space-separated; rows become paragraphs.
    expect(text).toContain('Feature Status');
    expect(text).toContain('Render Stable');
  });

  it('produces clean plain text from a fully rendered document', async () => {
    const text = await renderPlainText(
      <Html>
        <Head>
          <title>Email title</title>
        </Head>
        <Preview>Hidden preview text</Preview>
        <Body>
          <Text>First paragraph.</Text>
          <Text>
            Line one
            <br />
            Line two
          </Text>
          <Img src="https://example.com/logo.png" alt="Logo" />
          <Row>
            <Column>Cell one</Column>
            <Column>Cell two</Column>
          </Row>
        </Body>
      </Html>,
    );

    expect(text).not.toContain('Email title');
    expect(text).not.toContain('Hidden preview text');
    expect(text).not.toMatch(/[\u200B\u200C\u00A0\uFEFF]/);
    expect(text).toContain('First paragraph.');
    expect(text).toContain('Line one\nLine two');
    expect(text).toContain('Logo');
    expect(text).toContain('Cell one Cell two');
  });
});

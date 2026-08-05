import { describe, expect, it } from 'vitest';
import { render, renderPlainText } from '../render';
import {
  Badge,
  Body,
  Button,
  Column,
  Html,
  Img,
  Preview,
  Stack,
  TableCaption,
  Text,
} from './index';

function openingTag(html: string, tagName: string): string {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`))?.[0] ?? '';
}

describe('component regressions', () => {
  it('keeps a numeric zero child in a Stack', async () => {
    const html = await render(
      <Html>
        <Body>
          <Stack>
            {0}
            <Text>After zero</Text>
          </Stack>
        </Body>
      </Html>,
    );

    expect(html).toContain('<td>0');
    expect(html).toContain('After zero');
  });

  it('renders React nodes inside Preview while excluding them from plain text', async () => {
    const email = (
      <Html>
        <Body>
          <Preview>
            <span>Nested preview</span>
          </Preview>
          <Text>Visible copy</Text>
        </Body>
      </Html>
    );

    const [html, text] = await Promise.all([
      render(email),
      renderPlainText(email),
    ]);

    expect(html).toContain('<span>Nested preview</span>');
    expect(text).not.toContain('Nested preview');
    expect(text).toContain('Visible copy');
  });

  it('applies caller spacing shorthands after component defaults', async () => {
    const badge = openingTag(await render(<Badge p={0}>Badge</Badge>), 'span');
    const caption = openingTag(
      await render(<TableCaption m={0}>Caption</TableCaption>),
      'caption',
    );
    const buttonHtml = await render(
      <Button href="https://example.com" p={0} pl={4}>
        Button
      </Button>,
    );
    const linkButtonHtml = await render(
      <Button href="https://example.com" variant="link" size="lg" p={2}>
        Link button
      </Button>,
    );
    const buttonCell = openingTag(buttonHtml, 'td');
    const buttonLink = openingTag(buttonHtml, 'a');
    const linkButton = openingTag(linkButtonHtml, 'a');

    expect(badge).toMatch(/padding-left:8px.*padding:0px/);
    expect(caption).toMatch(/margin-bottom:8px.*margin:0px/);
    expect(buttonLink).toMatch(/padding:0px.*padding-left:16px/);
    expect(buttonCell).toContain('mso-padding-alt:0px 0px 0px 16px');
    expect(linkButton).toMatch(/padding:8px/);
    expect(linkButton).toContain('font-size:18px');
  });

  it('mirrors resolved pixel image sizes into legacy attributes', async () => {
    const numericStringImage = openingTag(
      await render(
        <Img
          src="https://example.com/logo.png"
          alt="Logo"
          width="120"
          height="40"
        />,
      ),
      'img',
    );
    const percentageImage = openingTag(
      await render(
        <Img src="https://example.com/fluid.png" alt="Fluid" width="50%" />,
      ),
      'img',
    );
    const canonicalImage = openingTag(
      await render(
        <Img
          src="https://example.com/canonical.png"
          alt="Canonical dimensions"
          width={120}
          height={40}
          w={240}
          h={80}
        />,
      ),
      'img',
    );
    const canonicalColumn = openingTag(
      await render(
        <table>
          <tbody>
            <tr>
              <Column width={240} w={320}>
                Content
              </Column>
            </tr>
          </tbody>
        </table>,
      ),
      'td',
    );

    expect(numericStringImage).toContain('width="120"');
    expect(numericStringImage).toContain('height="40"');
    expect(numericStringImage).toContain('width:120px');
    expect(numericStringImage).toContain('height:40px');
    expect(percentageImage).not.toMatch(/\swidth="/);
    expect(percentageImage).toContain('width:50%');
    expect(canonicalImage).toContain('width="120"');
    expect(canonicalImage).toContain('height="40"');
    expect(canonicalImage).toContain('width:120px');
    expect(canonicalImage).toContain('height:40px');
    expect(canonicalColumn).toContain('width="240"');
    expect(canonicalColumn).toContain('width:240px');
  });

  it('omits non-portable image sources while preserving remote and cid URLs', async () => {
    const remoteImage = openingTag(
      await render(
        <Img src="https://example.com/logo.png" alt="Remote logo" />,
      ),
      'img',
    );
    const cidImage = openingTag(
      await render(<Img src="cid:logo@example.com" alt="Attached logo" />),
      'img',
    );
    const relativeImageHtml = await render(
      <Img src="/logo.png" alt="Relative logo" />,
    );
    const relativeImage = openingTag(relativeImageHtml, 'img');

    expect(remoteImage).toContain('src="https://example.com/logo.png"');
    expect(cidImage).toContain('src="cid:logo@example.com"');
    expect(relativeImage).not.toMatch(/\ssrc="/);
    expect(relativeImageHtml).not.toContain('rel="preload"');
  });
});

import { describe, expect, it } from 'vitest';
import { render, renderPlainText } from '../render';
import { Body, Html, Preview, Stack, Text } from './index';

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
});

import { Button as ChakraButton } from '@chakra-email/core';
import { Body, Html, Img, Link, Section, Text } from 'react-email';
import { describe, expect, it } from 'vitest';
import { reactEmailRenderer } from './index.js';

describe('reactEmailRenderer', () => {
  it('preserves generated dark CSS without a second render and supports forced modes', async () => {
    let renders = 0;
    function Counted() {
      renders++;
      return (
        <ChakraButton
          href="https://example.com"
          bg="#ffffff"
          _dark={{ bg: '#123456' }}
        >
          Mode
        </ChakraButton>
      );
    }
    const system = await reactEmailRenderer().render(<Counted />);
    expect(renders).toBe(1);
    expect(system.html).toContain('background-color: #123456 !important');
    expect(system.html).toContain('prefers-color-scheme');
    expect(system.text).not.toContain('ce-mode');
    const dark = await reactEmailRenderer().render(<Counted />, {
      colorMode: 'dark',
    });
    expect(dark.html).toContain('bgcolor="#123456"');
    expect(dark.html).not.toContain('prefers-color-scheme');
  });
  it('renders mixed React Email and Chakra Email components', async () => {
    const output = await reactEmailRenderer().render(
      <Html lang="en">
        <Body>
          <Section>
            <Text>Adapter body</Text>
            <ChakraButton href="https://example.com">Open account</ChakraButton>
          </Section>
        </Body>
      </Html>,
      { pretty: true },
    );

    expect(output.html).toContain('<!DOCTYPE html PUBLIC');
    expect(output.html).toContain('Adapter body');
    expect(output.html).toContain('href="https://example.com"');
    expect(output.text).toContain('Adapter body');
    expect(output.text).toContain('Open account https://example.com');
  });

  it('forwards plain-text conversion options', async () => {
    const output = await reactEmailRenderer().render(
      <Html>
        <Body>
          <Text data-skip-in-text="true">Skip me</Text>
          <Link href="https://example.com/keep">Keep me</Link>
        </Body>
      </Html>,
      {
        plainTextOptions: {
          selectors: [
            {
              selector: 'a',
              options: { linkBrackets: ['(', ')'] },
            },
          ],
        },
      },
    );

    expect(output.text).toBe('Keep me (https://example.com/keep)');
  });

  it('forwards URL policy to Chakra Email components', async () => {
    await expect(
      reactEmailRenderer().render(
        <ChakraButton href="https://user:secret@example.com/private">
          Private
        </ChakraButton>,
        { urlPolicy: { link: { onInvalidUrl: 'throw' } } },
      ),
    ).rejects.toMatchObject({ code: 'UNSAFE_URL' });
  });

  it('enforces final output limits', async () => {
    await expect(
      reactEmailRenderer().render(<Text>{'content '.repeat(10)}</Text>, {
        outputLimits: { maxTextBytes: 10 },
      }),
    ).rejects.toMatchObject({ code: 'OUTPUT_TOO_LARGE' });
  });

  it('removes React image preload hints from adapter output', async () => {
    const output = await reactEmailRenderer().render(
      <Img src="https://example.com/image.png" alt="Example" />,
    );

    expect(output.html).toContain('<img');
    expect(output.html).not.toContain('rel="preload"');
  });
});

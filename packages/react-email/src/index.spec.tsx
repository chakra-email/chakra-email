import { Button as ChakraButton } from '@chakra-email/core';
import { Body, Html, Link, Section, Text } from 'react-email';
import { describe, expect, it } from 'vitest';
import { reactEmailRenderer } from './index.js';

describe('reactEmailRenderer', () => {
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
});

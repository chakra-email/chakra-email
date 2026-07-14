import { describe, expect, it } from 'vitest';
import {
  Body,
  ChakraEmailProvider,
  Container,
  Html,
  Text,
  createChakraV3EmailTheme,
  render,
} from './index';
import { mapChakraPropsToStyles } from './system';

describe('chakra-email', () => {
  it('re-exports core rendering and components', async () => {
    const html = await render(
      <Html>
        <Body>
          <Container>
            <Text>Default package adapter.</Text>
          </Container>
        </Body>
      </Html>
    );

    expect(html).toContain('Default package adapter.');
  });

  it('supports Chakra v3-style token objects through the adapter helpers', async () => {
    const theme = createChakraV3EmailTheme({
      tokens: {
        colors: {
          brand: {
            500: { value: '#0055ff' },
          },
        },
        space: {
          4: { value: '16px' },
        },
      },
    });

    expect(mapChakraPropsToStyles({ bg: 'brand.500', p: 4 }, theme)).toEqual({
      backgroundColor: '#0055ff',
      padding: '16px',
    });

    const html = await render(
      <ChakraEmailProvider theme={theme}>
        <Html>
          <Body bg="brand.500">
            <Text px={4}>Theme provider adapter.</Text>
          </Body>
        </Html>
      </ChakraEmailProvider>
    );

    expect(html).toContain('background-color:#0055ff');
    expect(html).toContain('padding-left:16px');
  });
});

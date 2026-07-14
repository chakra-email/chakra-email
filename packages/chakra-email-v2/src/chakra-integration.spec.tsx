import { extendTheme } from '@chakra-ui/react-v2';
import { describe, expect, it } from 'vitest';
import {
  Body,
  ChakraEmailV2Provider,
  Html,
  Text,
  createChakraV2EmailTheme,
  render,
} from './index';
import { mapChakraPropsToStyles } from './system';

const chakraV2Theme = extendTheme({
  colors: {
    emailBrand: {
      300: '#6f9df0',
      500: '#1457d9',
    },
  },
  space: {
    emailInset: '1.125rem',
  },
  semanticTokens: {
    colors: {
      emailAccent: {
        default: 'emailBrand.500',
        _dark: 'emailBrand.300',
      },
    },
  },
});

describe('Chakra UI v2 integration', () => {
  it('adapts a real extendTheme result', () => {
    const theme = createChakraV2EmailTheme(chakraV2Theme);

    expect(
      mapChakraPropsToStyles({ color: 'emailAccent', p: 'emailInset' }, theme),
    ).toEqual({
      color: '#1457d9',
      padding: '18px',
    });
  });

  it('renders with a real extendTheme result passed directly to the provider', async () => {
    const html = await render(
      <ChakraEmailV2Provider theme={chakraV2Theme}>
        <Html>
          <Body>
            <Text color="emailAccent" p="emailInset">
              Real Chakra v2 theme
            </Text>
          </Body>
        </Html>
      </ChakraEmailV2Provider>,
    );

    expect(html).toContain('color:#1457d9');
    expect(html).toContain('padding:18px');
  });
});

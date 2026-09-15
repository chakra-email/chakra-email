import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineSlotRecipe,
} from '@chakra-ui/react';
import { describe, expect, it } from 'vitest';
import {
  Body,
  Button,
  ChakraEmailProvider,
  Html,
  Text,
  chakraEmailSlotRecipeKeys,
  chakraEmailThemeConfig,
  createChakraV3EmailTheme,
  render,
} from './index';
import { mapChakraPropsToStyles } from './system';

const chakraSystem = createSystem(
  defaultConfig,
  defineConfig({
    theme: {
      tokens: {
        colors: {
          emailBrand: {
            500: { value: '#1457d9' },
          },
        },
        spacing: {
          emailInset: { value: '18px' },
        },
      },
      semanticTokens: {
        colors: {
          emailAccent: {
            value: {
              base: '{colors.emailBrand.500}',
              _dark: '#ffffff',
            },
          },
        },
      },
    },
  }),
);

const chakraRecipeSystem = createSystem(
  defaultConfig,
  chakraEmailThemeConfig,
  defineConfig({
    theme: {
      slotRecipes: {
        [chakraEmailSlotRecipeKeys.button]: defineSlotRecipe({
          slots: ['root', 'cell', 'link'],
          variants: {
            variant: {
              solid: {
                cell: { bg: '#123456' },
                link: { color: '#ffffff' },
              },
            },
          },
        }),
      },
    },
  }),
);

describe('Chakra UI v3 integration', () => {
  it('adapts a real createSystem result', () => {
    const theme = createChakraV3EmailTheme(chakraSystem);

    expect(
      mapChakraPropsToStyles({ color: 'emailAccent', p: 'emailInset' }, theme),
    ).toEqual({
      color: '#1457d9',
      padding: '18px',
    });
  });

  it('renders with a real Chakra system passed directly to the provider', async () => {
    const html = await render(
      <ChakraEmailProvider theme={chakraSystem}>
        <Html>
          <Body>
            <Text color="emailAccent" p="emailInset">
              Real Chakra v3 theme
            </Text>
          </Body>
        </Html>
      </ChakraEmailProvider>,
    );

    expect(html).toContain('color:#1457d9');
    expect(html).toContain('padding:18px');
  });

  it('preserves the default email theme when no Chakra system is supplied', async () => {
    const html = await render(
      <ChakraEmailProvider>
        <Html>
          <Body>
            <Text color="brand.500">Default provider theme</Text>
          </Body>
        </Html>
      </ChakraEmailProvider>,
    );

    expect(html).toContain('color:#6366f1');
  });

  it('accepts the portable recipe config in a real Chakra system', async () => {
    const html = await render(
      <ChakraEmailProvider theme={chakraRecipeSystem}>
        <Button href="https://example.com">System recipe</Button>
      </ChakraEmailProvider>,
    );

    expect(html).toContain('background-color:#123456');
    expect(html).toContain('color:#ffffff');
  });
});

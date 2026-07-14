import {
  Body,
  Button,
  ChakraEmailV2Provider,
  Container,
  Html,
  Text,
  render,
} from '@chakra-email/chakra-v2';

// A Chakra UI v2-style theme (e.g. `extendTheme` output): rem-based scales,
// mode-conditional semantic tokens, and runtime-only keys. The provider
// converts rem/em to px (1rem = 16px), resolves semantic tokens in default
// mode (`_dark` is ignored), and drops `config`/`components`/etc.
const chakraV2Theme = {
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      300: '#a5b4fc',
      500: '#6366f1',
    },
    gray: {
      50: '#f7fafc',
      700: '#2d3748',
    },
  },
  space: {
    px: '1px',
    1: '0.25rem',
    2: '0.5rem',
    4: '1rem',
    6: '1.5rem', // -> 24px
  },
  fontSizes: {
    sm: '0.875rem', // -> 14px
    md: '1rem', // -> 16px
  },
  semanticTokens: {
    colors: {
      accent: { default: 'brand.500', _dark: 'brand.300' },
      body: 'gray.700',
    },
  },
};

export async function renderLegacyThemeEmail() {
  return render(
    <ChakraEmailV2Provider theme={chakraV2Theme}>
      <Html>
        <Body bg="gray.50">
          <Container bg="white" p={6}>
            <Text color="body" fontSize="md">
              Rendered with a Chakra UI v2-style theme.
            </Text>
            <Button href="https://example.com" bg="accent" color="white">
              Open
            </Button>
          </Container>
        </Body>
      </Html>
    </ChakraEmailV2Provider>,
    { pretty: true }
  );
}

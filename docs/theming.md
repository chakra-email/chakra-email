# Theming

`chakra-email` resolves Chakra-style theme tokens into inline styles before rendering the email.

## Chakra UI v3-Style Tokens

Use `ChakraEmailProvider` from `chakra-email` for current Chakra UI v3-style token objects.

```tsx
import { ChakraEmailProvider, Text } from 'chakra-email';

const theme = {
  tokens: {
    colors: {
      brand: {
        500: { value: '#6366f1' },
      },
    },
    spacing: {
      6: { value: '24px' },
    },
  },
};

export function EmailBody() {
  return (
    <ChakraEmailProvider theme={theme}>
      <Text color="brand.500" p={6}>
        Token-aware email copy.
      </Text>
    </ChakraEmailProvider>
  );
}
```

## Supported Scales

The resolver supports common Chakra scales:

- `colors`
- `space` and `spacing`
- `sizes`
- `fontSizes`
- `fontWeights`
- `fonts`
- `lineHeights`
- `radii`
- `borders`
- `borderWidths`
- `letterSpacings`

Semantic color tokens are also supported for common color lookups. The core resolver (used by `chakra-email` and `@chakra-email/core`) understands v3-format semantic tokens — `semanticTokens.colors` entries with `{ value: ... }` objects and `{colors.red.500}`-style brace references. Chakra UI v2-format semantic tokens (`{ default: 'red.500', _dark: ... }` objects or bare `'red.500'` strings) are not understood by the core resolver directly; use `@chakra-email/chakra-v2`, whose adapter converts them (default mode only — `_dark` is ignored since email has no reliable dark-mode CSS).

## Chakra UI v2-Style Themes

Use `@chakra-email/chakra-v2` when your theme uses flat scales directly on the theme object. Its provider adapts the theme for email: `rem`/`em` values are converted to `px` (1rem = 16px), v2 semantic tokens are resolved in default mode, and runtime-only keys (`components`, `styles`, `config`, `breakpoints`, `transition`, `zIndices`) are dropped. See the [Chakra UI v2 guide](./chakra-v2.md) for details.

```tsx
import { ChakraEmailV2Provider, Text } from '@chakra-email/chakra-v2';

export function LegacyEmail({ chakraV2Theme }) {
  return (
    <ChakraEmailV2Provider theme={chakraV2Theme}>
      <Text color="brand.500">Legacy theme support.</Text>
    </ChakraEmailV2Provider>
  );
}
```

## Defaults

If no provider is used, Chakra Email falls back to a small default theme with colors, spacing, typography, radii, and border defaults suitable for examples and simple templates.

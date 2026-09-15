# Chakra UI v2

Use `@chakra-email/chakra-v2` when your application still has Chakra UI v2-style theme objects.

```bash
npm install @chakra-email/chakra-v2 react react-dom
```

## What The Adapter Does

Chakra UI v2 themes (including `extendTheme` output) are not email-safe as-is, so `ChakraEmailV2Provider` and `createChakraV2EmailTheme` adapt them before token resolution:

- **`rem`/`em` values become `px`** at a 16px root font size. This applies recursively across the length scales (`space`, `spacing`, `sizes`, `fontSizes`, `lineHeights`, `letterSpacings`, `radii`, `borders`, `borderWidths`) and inside composite border strings (`'0.0625rem solid #cbd5e0'` → `'1px solid #cbd5e0'`). Unitless line-heights stay unitless, and values already in `px` or other units pass through unchanged. `rem` is unsupported in Outlook desktop, which is why everything is normalized to `px`.
- **v2 `semanticTokens` preserve both color modes.** For `{ default: 'red.500', _dark: 'red.300' }`, the adapter normalizes the light and dark values separately, including semantic aliases. Other conditions are ignored. Plain-string tokens (`accent: 'teal.500'`) work too. Bare references resolve against the matching scale; literal CSS values remain unchanged. See [light and dark email colors](./theming.md#light-and-dark-email-colors) for rendering and client-support limitations.
- **Runtime-only keys are dropped.** `components`, `styles`, `config`, `breakpoints`, `transition`, and `zIndices` rely on runtime CSS, media queries, or color mode, none of which apply to rendered email, so the adapter removes them.

```tsx
import { createChakraV2EmailTheme } from '@chakra-email/chakra-v2';

const emailTheme = createChakraV2EmailTheme({
  space: { 6: '1.5rem' }, // -> '24px'
  fontSizes: { sm: '0.875rem' }, // -> '14px'
  semanticTokens: {
    colors: {
      danger: { default: 'red.500', _dark: 'red.300' }, // both modes preserved
    },
  },
  components: {}, // dropped
});
```

## Example

```tsx
import {
  Body,
  ChakraEmailV2Provider,
  Container,
  Html,
  Text,
  render,
} from '@chakra-email/chakra-v2';

export async function renderLegacyEmail(chakraV2Theme) {
  return render(
    <ChakraEmailV2Provider theme={chakraV2Theme}>
      <Html>
        <Body bg="gray.50">
          <Container bg="white" p={6}>
            <Text color="gray.700">Rendered with a Chakra UI v2 theme.</Text>
          </Container>
        </Body>
      </Html>
    </ChakraEmailV2Provider>,
  );
}
```

## Choosing A Package

- Use `chakra-email` for new projects and Chakra UI v3-style token objects.
- Use `@chakra-email/chakra-v2` for legacy Chakra UI v2-style flat theme scales.
- Use `@chakra-email/core` only when building adapters or custom tooling.

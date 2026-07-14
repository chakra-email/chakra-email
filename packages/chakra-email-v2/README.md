# @chakra-email/chakra-v2

[![npm](https://img.shields.io/npm/v/%40chakra-email%2Fchakra-v2?style=flat-square)](https://www.pkgstats.com/pkg:@chakra-email/chakra-v2)
[![NPM](https://img.shields.io/npm/l/%40chakra-email%2Fchakra-v2?style=flat-square)](https://github.com/ryanhefner/chakra-email/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/dt/%40chakra-email%2Fchakra-v2?style=flat-square)](https://www.pkgstats.com/pkg:@chakra-email/chakra-v2)

Legacy Chakra UI v2-compatible adapter for Chakra Email.

Use this package when an existing codebase still uses Chakra UI v2-style theme scales such as `colors`, `space`, `fontSizes`, `fontWeights`, `fonts`, and `radii` directly on the theme object.

## What The Adapter Converts

`ChakraEmailV2Provider` and `createChakraV2EmailTheme` adapt a Chakra UI v2 theme (e.g. `extendTheme` output) into email-safe tokens:

- **`rem`/`em` → `px`** at a 16px root font size across length scales (`space`, `spacing`, `sizes`, `fontSizes`, `lineHeights`, `letterSpacings`, `radii`, `borders`, `borderWidths`), including inside composite border strings such as `'0.0625rem solid #cbd5e0'`. Unitless values (e.g. numeric line-heights) are preserved as-is. `rem`/`em` is not reliable in email clients like Outlook desktop, so everything becomes `px`.
- **v2 `semanticTokens`** are rewritten so the token resolver understands them. Only the `default` mode is used — `_dark` and other conditions are ignored because email has no reliable dark-mode CSS. Bare token references like `'red.500'` are resolved against the matching scale (e.g. `colors`), while literal CSS values (`'#fff'`, `'rgba(...)'`) pass through untouched. Both object form (`{ default: 'red.500', _dark: 'red.300' }`) and plain-string form (`'red.500'`) are supported.
- **Non-visual v2 keys are dropped**: `components`, `styles`, `config`, `breakpoints`, `transition`, and `zIndices` have no effect on rendered email and are removed rather than silently carried along.

## Install

```bash
npm install @chakra-email/chakra-v2 react react-dom
```

> [!NOTE]
> `@chakra-email/chakra-v2` is ESM-only (no CommonJS build). Use `import`, or Node.js 20.19+ where `require()` of ESM modules is supported. Node.js 20.19.0 or newer is required.

## Usage

```tsx
import {
  Body,
  Button,
  ChakraEmailV2Provider,
  Container,
  Html,
  Text,
  render,
} from '@chakra-email/chakra-v2';

const html = await render(
  <ChakraEmailV2Provider theme={chakraV2Theme}>
    <Html>
      <Body bg="gray.50">
        <Container p={6}>
          <Text color="gray.700">Legacy Chakra v2 theme support.</Text>
          <Button href="https://example.com" bg="brand.500">
            Open
          </Button>
        </Container>
      </Body>
    </Html>
  </ChakraEmailV2Provider>,
);
```

## When To Use This Package

Use `@chakra-email/chakra-v2` when you already have a Chakra UI v2 theme and want the email renderer to understand the same flat theme scales.

Use `chakra-email` for new projects or Chakra UI v3-style token objects.

The shared email renderer, primitives, and markdown-body components come from `@chakra-email/core`.

## More Docs

- [Chakra UI v2 guide](https://github.com/ryanhefner/chakra-email/blob/main/docs/chakra-v2.md)
- [Components](https://github.com/ryanhefner/chakra-email/blob/main/docs/components.md)
- [Markdown](https://github.com/ryanhefner/chakra-email/blob/main/docs/markdown.md)

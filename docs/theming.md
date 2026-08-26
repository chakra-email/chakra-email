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

## Component Recipes

Every visually styled component resolves its defaults from a named recipe. Components with meaningful internal elements use slot recipes. Recipe output is resolved to email-safe inline styles; it does not depend on generated class names or a browser stylesheet.

Use the exported keys to override a recipe without depending on its string name:

```tsx
import {
  ChakraEmailProvider,
  chakraEmailRecipeKeys,
  chakraEmailSlotRecipeKeys,
  defineRecipe,
  defineSlotRecipe,
} from 'chakra-email';

const emailTheme = {
  semanticTokens: {
    colors: {
      accent: {
        DEFAULT: { value: '#0057ff' },
        contrast: { value: '#ffffff' },
      },
    },
  },
  recipes: {
    [chakraEmailRecipeKeys.text]: defineRecipe({
      base: { color: 'fg.muted', fontSize: 'sm' },
    }),
  },
  slotRecipes: {
    [chakraEmailSlotRecipeKeys.button]: defineSlotRecipe({
      slots: ['root', 'cell', 'link'],
      variants: {
        variant: {
          solid: {
            cell: { bg: 'accent', rounded: 'lg' },
            link: { color: 'accent.contrast' },
          },
        },
      },
    }),
  },
};

export function Email({ children }) {
  return (
    <ChakraEmailProvider theme={emailTheme}>{children}</ChakraEmailProvider>
  );
}
```

Recipes support `base`, `variants`, `defaultVariants`, and `compoundVariants`. Caller style props are applied last. For multipart components, caller style props continue to target the component's primary visual surface while the slot recipe controls its internal elements.

### Chakra UI v3 Systems

`chakraEmailThemeConfig` is a portable Chakra configuration containing the default recipes, slot recipes, and semantic colors. It can be composed directly into a real Chakra system:

```ts
import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
} from '@chakra-ui/react';
import { chakraEmailRecipeKeys, chakraEmailThemeConfig } from 'chakra-email';

export const system = createSystem(
  defaultConfig,
  chakraEmailThemeConfig,
  defineConfig({
    theme: {
      recipes: {
        [chakraEmailRecipeKeys.link]: defineRecipe({
          base: { color: 'accent', textDecoration: 'none' },
        }),
      },
    },
  }),
);
```

Pass that system to `ChakraEmailProvider`. Chakra Email reads the system configuration and resolves the selected recipes into inline styles.

### Recipe Keys

Single-part recipes cover:

- `badge`, `blockquote`, `body`, `box`, `code`, `column`
- `heading`, `hr`, `html`, `img`, `link`
- `pre`, `row`, `spacer`, `text`

The keys are available from `chakraEmailRecipeKeys`, and the complete default map is exported as `chakraEmailRecipes`.

Multipart slot recipes are:

| Key         | Components                    | Slots                                                                        |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `button`    | `Button`                      | `root`, `cell`, `link`                                                       |
| `container` | `Container`                   | `root`, `cell`                                                               |
| `list`      | `List`, `ListItem`            | `root`, `item`                                                               |
| `preview`   | `Preview`                     | `root`, `spacer`                                                             |
| `section`   | `Section`                     | `root`, `cell`                                                               |
| `stack`     | `Stack`                       | `root`, `item`                                                               |
| `table`     | `Table` and its subcomponents | `root`, `header`, `body`, `footer`, `row`, `columnHeader`, `cell`, `caption` |

The keys are available from `chakraEmailSlotRecipeKeys`, and the complete default map is exported as `chakraEmailSlotRecipes`. `Table` propagates its `size` and `variant` selections to all nested table slots.

`Head` has no recipe because it only emits document metadata and has no visual style surface.

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

If no provider is used, Chakra Email falls back to a small default theme with colors, spacing, typography, radii, borders, recipes, and slot recipes suitable for examples and simple templates. Component colors use the portable semantic tokens `bg`, `fg`, `border`, and `accent` rather than direct palette references.

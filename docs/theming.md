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

Semantic color tokens are supported, including `{ value: ... }` objects and
`{colors.red.500}`-style references to palette or semantic colors. For v2 tokens
with bare aliases such as `{ default: 'red.500', _dark: 'red.300' }`, use
`@chakra-email/chakra-v2` to normalize both modes.

## Light and dark email colors

Use semantic colors for surfaces, text, accents, and borders that should adapt:

```tsx
import { Body, ChakraEmailProvider, Head, Html, Text } from 'chakra-email';

const theme = {
  semanticTokens: {
    colors: {
      page: { value: { _light: '#ffffff', _dark: '#171717' } },
      ink: { value: { _light: '#171717', _dark: '#fafafa' } },
    },
  },
};

export function Email() {
  return (
    <ChakraEmailProvider theme={theme}>
      <Html>
        <Head />
        <Body bg="page" color="ink">
          <Text color="ink">Readable in either authored color mode.</Text>
        </Body>
      </Html>
    </ChakraEmailProvider>
  );
}
```

Render with Chakra Email's `render` or `renderEmail`. The default `system` mode
keeps light colors inline and adds dark overrides in a
`prefers-color-scheme: dark` stylesheet, collected during the same React render.
The built-in `bg`, `fg`, `border`, and `accent` tokens already define both modes.
Choose semantic backgrounds and foregrounds together: a fixed `bg="white"` stays
white even when a semantic foreground changes in dark mode.

For a local exception, components and recipe styles accept shallow condition
blocks, for example `<Text color="fg" _dark={{ color: '#ffffff' }} />`.
Use these blocks rather than an object inside the `color` prop.

`ChakraEmailProvider`, `ChakraEmailV2Provider`, and core `ThemeProvider` accept
`colorMode="light" | "dark" | "system"`. A forced provider mode resolves that
subtree to inline colors. A forced mode on the [renderer](./rendering.md#color-mode)
takes precedence over provider settings. Calling React's `renderToStaticMarkup`
directly does not collect the system-mode stylesheet.

Dark CSS is progressive enhancement; client support and automatic color
inversion vary. Fixed colors are not automatically inverted by Chakra Email,
and the browser preview is not an emulation of Gmail or Outlook.

### Custom native components

Pass styles from `useChakraStyles` or `useSlotRecipeStyles` to
`getEmailStyleProps(styles, className)` from `chakra-email/system`, then spread
the returned props onto the native element. This preserves inline styles and
registers its dark-mode class. Use `mergeInlineStyles` for additional inline
overrides instead of spreading the style object, which loses its mode metadata.

## Component Recipes

Every visually styled component resolves its defaults from a named recipe. Components with meaningful internal elements use slot recipes. Base styles remain inline; system-mode dark overrides use generated classes and a media query.

Use the exported keys to override a recipe without depending on its string name:

Theme-only modules should import from `chakra-email/theme` so TypeScript does
not load component and rendering declarations. Component modules can continue
to use the `chakra-email` root.

```tsx
import {
  ChakraEmailProvider,
  chakraEmailRecipeKeys,
  chakraEmailSlotRecipeKeys,
  defineRecipe,
  defineSlotRecipe,
} from 'chakra-email/theme';

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
import {
  chakraEmailRecipeKeys,
  chakraEmailThemeConfig,
} from 'chakra-email/theme';

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

| Key         | Components                    | Slots                                                                                                                                       |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `button`    | `Button`                      | `root`, `cell`, `link`                                                                                                                      |
| `codeBlock` | `@chakra-email/code-block`    | `root`, `code`, `line`, `lineNumber`, `token`                                                                                               |
| `container` | `Container`                   | `root`, `cell`                                                                                                                              |
| `list`      | `List`, `ListItem`            | `root`, `item`                                                                                                                              |
| `markdown`  | `@chakra-email/markdown`      | `root`, `heading`, `paragraph`, `link`, `blockquote`, `list`, `listItem`, `code`, `pre`, `hr`, `table`, `tableHeader`, `tableCell`, `image` |
| `preview`   | `Preview`                     | `root`, `spacer`                                                                                                                            |
| `section`   | `Section`                     | `root`, `cell`                                                                                                                              |
| `stack`     | `Stack`                       | `root`, `item`                                                                                                                              |
| `table`     | `Table` and its subcomponents | `root`, `header`, `body`, `footer`, `row`, `columnHeader`, `cell`, `caption`                                                                |

The keys are available from `chakraEmailSlotRecipeKeys`, and the complete default map is exported as `chakraEmailSlotRecipes`. `Table` propagates its `size` and `variant` selections to all nested table slots.

`Head` and `Font` have no recipes because they emit document metadata and CSS rather than visual component markup. `Font` still resolves `fontFamily` and `fallbackFontFamily` values from the nearest theme, so font tokens remain centrally customizable.

## Chakra UI v2-Style Themes

Use `@chakra-email/chakra-v2` when your theme uses flat scales directly on the theme object. Its provider adapts the theme for email: `rem`/`em` values are converted to `px` (1rem = 16px), v2 semantic tokens preserve default and dark modes, and runtime-only keys (`components`, `styles`, `config`, `breakpoints`, `transition`, `zIndices`) are dropped. See the [Chakra UI v2 guide](./chakra-v2.md) for details.

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

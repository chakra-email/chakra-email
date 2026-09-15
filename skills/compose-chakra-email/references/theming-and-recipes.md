# Theming and recipes

## Use one theme seam

Put reusable decisions in `ChakraEmailProvider` instead of repeating literal
styles across templates. New applications normally use a Chakra UI v3-style
theme object:

```tsx
import {
  ChakraEmailProvider,
  chakraEmailRecipeKeys,
  chakraEmailSlotRecipeKeys,
  defineRecipe,
  defineSlotRecipe,
} from 'chakra-email';

const emailTheme = {
  tokens: {
    colors: {
      brand: {
        500: { value: '#6366f1' },
        700: { value: '#4338ca' },
      },
    },
  },
  semanticTokens: {
    colors: {
      accent: {
        DEFAULT: { value: '{colors.brand.500}' },
        contrast: { value: '{colors.white}' },
      },
    },
  },
  recipes: {
    [chakraEmailRecipeKeys.text]: defineRecipe({
      base: { color: 'fg', lineHeight: 'tall' },
    }),
  },
  slotRecipes: {
    [chakraEmailSlotRecipeKeys.button]: defineSlotRecipe({
      slots: ['root', 'cell', 'link'],
      base: {
        cell: { bg: 'accent', rounded: 'md' },
        link: { color: 'accent.contrast' },
      },
    }),
  },
};

export function EmailTheme({ children }: { children: React.ReactNode }) {
  return (
    <ChakraEmailProvider theme={emailTheme}>{children}</ChakraEmailProvider>
  );
}
```

Prefer `bg`, `bg.subtle`, `fg`, `fg.muted`, `border`, `accent`,
`accent.subtle`, and `accent.contrast` as shared component defaults. Override
the palette or semantic tokens once for each brand. Avoid direct `teal.*` or
another product palette in reusable defaults.

## Override the correct recipe

Single-part recipes cover `badge`, `blockquote`, `body`, `box`, `code`,
`column`, `heading`, `hr`, `html`, `img`, `link`, `pre`, `row`, `spacer`, and
`text`. Use `chakraEmailRecipeKeys` instead of depending on raw string keys.

Slot recipes cover components with meaningful internal styling surfaces:

| Key         | Important slots                                                              |
| ----------- | ---------------------------------------------------------------------------- |
| `button`    | `root`, `cell`, `link`                                                       |
| `container` | `root`, `cell`                                                               |
| `list`      | `root`, `item`                                                               |
| `preview`   | `root`, `spacer`                                                             |
| `section`   | `root`, `cell`                                                               |
| `stack`     | `root`, `item`                                                               |
| `table`     | `root`, `header`, `body`, `footer`, `row`, `columnHeader`, `cell`, `caption` |
| `markdown`  | document element slots exposed by `@chakra-email/markdown`                   |
| `codeBlock` | `root`, `code`, `line`, `lineNumber`, `token`                                |

Use `chakraEmailSlotRecipeKeys` for the core slots. Optional Markdown and code
packages also export their recipe definitions and keys. Inspect the installed
types for exact slot names because optional-package APIs may evolve separately.

Recipes support `base`, `variants`, `defaultVariants`, and
`compoundVariants`. Caller style props apply last. On multipart components,
caller props target the primary visual surface while slot recipes control the
internal elements.

`Head` and `Font` intentionally have no visual recipe. `Font` resolves
`fontFamily` and `fallbackFontFamily` from the nearest theme and emits document
CSS inside `Head`.

## Use a real Chakra system when appropriate

`chakraEmailThemeConfig` contains the portable default recipes, slot recipes,
and semantic colors. A Chakra UI v3 application can compose it into its
existing system, add host overrides after it, and pass that system to
`ChakraEmailProvider`. Preserve the host system instead of creating a parallel
one when the application already owns Chakra configuration.

Email clients do not provide a reliable equivalent of application color mode.
Choose a durable default-mode palette and treat dark-mode CSS as an optional
enhancement. For Chakra UI v2 semantic tokens, the adapter deliberately uses
the `default` value and ignores `_dark`.

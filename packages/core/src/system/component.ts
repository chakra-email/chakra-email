import type { CSSProperties, ReactNode } from 'react';
import {
  resolveRecipe,
  resolveSlotRecipe,
  useTheme,
  type RecipeSelection,
} from '../theme/index.js';
import {
  mapChakraPropsToStyles,
  type ChakraEmailStyleProps,
} from './style-props.js';
import {
  emailDarkStyles,
  emailStyleRender,
  useEmailColorModeRender,
  withEmailDarkStyles,
} from './color-mode.js';

export interface BaseChakraEmailProps extends ChakraEmailStyleProps {
  id?: string;
  className?: string;
  title?: string;
  children?: ReactNode;
}

export function mergeInlineStyles(
  base: CSSProperties | undefined,
  override: CSSProperties | undefined,
): CSSProperties {
  const render = emailStyleRender(override) ?? emailStyleRender(base);
  const dark = render
    ? mergeInlineStyles(emailDarkStyles(base), emailDarkStyles(override))
    : undefined;
  const styles = { ...base };

  for (const property of Object.keys(override ?? {}) as Array<
    keyof CSSProperties
  >) {
    delete styles[property];
    styles[property] = override?.[property] as never;
  }

  return dark ? withEmailDarkStyles(styles, dark, render) : styles;
}

export function useChakraStyles(
  props: ChakraEmailStyleProps,
  defaults?: ChakraEmailStyleProps,
): CSSProperties {
  const theme = useTheme();
  const render = useEmailColorModeRender();
  const mode =
    render?.mode !== undefined && render.mode !== 'system'
      ? render.mode
      : (theme.colorMode ?? 'system');
  const resolve = (colorMode: 'light' | 'dark') => {
    const resolvedTheme = { ...theme, colorMode };
    const input =
      colorMode === 'dark'
        ? { ...props, style: emailDarkStyles(props.style) }
        : props;
    return mergeInlineStyles(
      mapChakraPropsToStyles(defaults ?? {}, resolvedTheme),
      mapChakraPropsToStyles(input, resolvedTheme),
    );
  };
  const styles = resolve(mode === 'dark' ? 'dark' : 'light');
  return mode === 'system'
    ? withEmailDarkStyles(styles, resolve('dark'), render)
    : styles;
}

export function useRecipeStyles(
  key: string,
  selection: RecipeSelection | undefined,
  props: ChakraEmailStyleProps = {},
): CSSProperties {
  const theme = useTheme();
  return useChakraStyles(props, resolveRecipe(theme.recipes?.[key], selection));
}

export function useSlotRecipeStyles(
  key: string,
  selection?: RecipeSelection,
): Record<string, CSSProperties> {
  const theme = useTheme();
  const recipe = resolveSlotRecipe(theme.slotRecipes?.[key], selection);
  const render = useEmailColorModeRender();
  const mode =
    render?.mode !== undefined && render.mode !== 'system'
      ? render.mode
      : (theme.colorMode ?? 'system');

  return Object.fromEntries(
    Object.entries(recipe).map(([slot, props]) => [
      slot,
      withEmailDarkStyles(
        mapChakraPropsToStyles(props, {
          ...theme,
          colorMode: mode === 'dark' ? 'dark' : 'light',
        }),
        mapChakraPropsToStyles(props, { ...theme, colorMode: 'dark' }),
        mode === 'system' ? render : undefined,
      ),
    ]),
  );
}

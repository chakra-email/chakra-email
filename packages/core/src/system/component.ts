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
  const styles = { ...base };

  for (const property of Object.keys(override ?? {}) as Array<
    keyof CSSProperties
  >) {
    delete styles[property];
    styles[property] = override?.[property] as never;
  }

  return styles;
}

export function useChakraStyles(
  props: ChakraEmailStyleProps,
  defaults?: ChakraEmailStyleProps,
): CSSProperties {
  const theme = useTheme();

  if (defaults === undefined) {
    return mapChakraPropsToStyles(props, theme);
  }

  const defaultStyles = mapChakraPropsToStyles(defaults, theme);
  const overrideStyles = mapChakraPropsToStyles(props, theme);

  return mergeInlineStyles(defaultStyles, overrideStyles);
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

  return Object.fromEntries(
    Object.entries(recipe).map(([slot, props]) => [
      slot,
      mapChakraPropsToStyles(props, theme),
    ]),
  );
}

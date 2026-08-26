import type { HTMLAttributes, LiHTMLAttributes } from 'react';
import {
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailSlotRecipeKeys } from '../theme/index.js';

export interface ListProps
  extends
    BaseChakraEmailProps,
    Omit<
      HTMLAttributes<HTMLUListElement | HTMLOListElement>,
      keyof BaseChakraEmailProps
    > {
  as?: 'ul' | 'ol';
}

export interface ListItemProps
  extends
    BaseChakraEmailProps,
    Omit<LiHTMLAttributes<HTMLLIElement>, keyof BaseChakraEmailProps> {}

export function List({ as: Component = 'ul', children, ...props }: ListProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useSlotRecipeStyles(chakraEmailSlotRecipeKeys.list);
  const styles = mergeInlineStyles(
    recipeStyles.root,
    useChakraStyles(styleProps),
  );

  return (
    <Component {...elementProps} style={styles}>
      {children}
    </Component>
  );
}

export function ListItem({ children, ...props }: ListItemProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useSlotRecipeStyles(chakraEmailSlotRecipeKeys.list);
  const styles = mergeInlineStyles(
    recipeStyles.item,
    useChakraStyles(styleProps),
  );

  return (
    <li {...elementProps} style={styles}>
      {children}
    </li>
  );
}

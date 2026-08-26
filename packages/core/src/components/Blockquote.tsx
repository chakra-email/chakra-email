import type { BlockquoteHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys, useTheme } from '../theme/index.js';
import { resolveBorderColor } from './Hr.js';

export interface BlockquoteProps
  extends
    BaseChakraEmailProps,
    Omit<
      BlockquoteHTMLAttributes<HTMLQuoteElement>,
      keyof BaseChakraEmailProps
    > {}

export function Blockquote({
  borderColor,
  children,
  ...props
}: BlockquoteProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const theme = useTheme();
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.blockquote,
    undefined,
    borderColor ? { borderColor, ...styleProps } : styleProps,
  );
  styles.borderLeft ??= `4px solid ${styles.borderColor ?? resolveBorderColor(undefined, theme)}`;
  delete styles.borderColor;

  return (
    <blockquote {...elementProps} style={styles}>
      {children}
    </blockquote>
  );
}

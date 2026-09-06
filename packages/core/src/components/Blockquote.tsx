import {
  getEmailStyleProps,
  updateEmailStyleModes,
} from '../system/color-mode.js';
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
  updateEmailStyleModes(styles, (value) => {
    value.borderLeft ??= `4px solid ${value.borderColor ?? resolveBorderColor(undefined, theme)}`;
    delete value.borderColor;
  });

  return (
    <blockquote
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </blockquote>
  );
}

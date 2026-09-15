import { getEmailStyleProps } from '../system/color-mode.js';
import type { HTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export interface CodeProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLElement>, keyof BaseChakraEmailProps> {}

export function Code({ children, ...props }: CodeProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.code,
    undefined,
    styleProps,
  );

  return (
    <code
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </code>
  );
}

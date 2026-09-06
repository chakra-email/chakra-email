import { getEmailStyleProps } from '../system/color-mode.js';
import type { HTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export interface RowProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLTableRowElement>, keyof BaseChakraEmailProps> {}

export function Row({ children, ...props }: RowProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.row,
    undefined,
    styleProps,
  );

  return (
    <tr
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </tr>
  );
}

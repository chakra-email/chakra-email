import { getEmailStyleProps } from '../system/color-mode.js';
import type { TdHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';
import { getLegacyWidthAttribute } from './layout-styles.js';

export interface ColumnProps
  extends
    BaseChakraEmailProps,
    Omit<
      TdHTMLAttributes<HTMLTableCellElement>,
      keyof BaseChakraEmailProps | 'align' | 'width'
    > {
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export function Column({ width, align, children, ...props }: ColumnProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(chakraEmailRecipeKeys.column, undefined, {
    width,
    ...styleProps,
  });
  const legacyWidth = getLegacyWidthAttribute(styles.width);

  return (
    <td
      {...elementProps}
      width={legacyWidth}
      align={align}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </td>
  );
}

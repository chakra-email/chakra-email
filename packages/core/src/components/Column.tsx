import type { TdHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
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
  const styles = useChakraStyles(
    { width, ...styleProps },
    {
      verticalAlign: 'top',
    },
  );
  const legacyWidth = getLegacyWidthAttribute(styles.width);

  return (
    <td {...elementProps} width={legacyWidth} align={align} style={styles}>
      {children}
    </td>
  );
}

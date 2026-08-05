import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { useTheme } from '../theme/index.js';
import { resolveBorderColor } from './Hr.js';
import { getLegacyWidthAttribute } from './layout-styles.js';

export interface TableProps
  extends
    BaseChakraEmailProps,
    Omit<TableHTMLAttributes<HTMLTableElement>, keyof BaseChakraEmailProps> {}

export interface TableHeadProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLTableSectionElement>, keyof BaseChakraEmailProps> {}

export interface TableBodyProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLTableSectionElement>, keyof BaseChakraEmailProps> {}

export interface TableFootProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLTableSectionElement>, keyof BaseChakraEmailProps> {}

export interface TableRowProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLTableRowElement>, keyof BaseChakraEmailProps> {}

export interface TableHeaderProps
  extends
    BaseChakraEmailProps,
    Omit<ThHTMLAttributes<HTMLTableCellElement>, keyof BaseChakraEmailProps> {}

export interface TableCellProps
  extends
    BaseChakraEmailProps,
    Omit<TdHTMLAttributes<HTMLTableCellElement>, keyof BaseChakraEmailProps> {}

export interface TableCaptionProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLTableCaptionElement>, keyof BaseChakraEmailProps> {}

export function Table({ children, ...props }: TableProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    m: '0 0 16px',
    w: 'full',
    style: {
      borderCollapse: 'collapse',
      borderSpacing: 0,
    },
  });
  const legacyWidth = getLegacyWidthAttribute(styles.width) ?? '100%';

  return (
    <table
      {...elementProps}
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width={legacyWidth}
      style={styles}
    >
      {children}
    </table>
  );
}

export function TableHead({ children, ...props }: TableHeadProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);

  return (
    <thead {...elementProps} style={styles}>
      {children}
    </thead>
  );
}

export function TableBody({ children, ...props }: TableBodyProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);

  return (
    <tbody {...elementProps} style={styles}>
      {children}
    </tbody>
  );
}

export function TableFoot({ children, ...props }: TableFootProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);

  return (
    <tfoot {...elementProps} style={styles}>
      {children}
    </tfoot>
  );
}

export function TableRow({ children, ...props }: TableRowProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);

  return (
    <tr {...elementProps} style={styles}>
      {children}
    </tr>
  );
}

export function TableHeader({
  borderColor,
  children,
  ...props
}: TableHeaderProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    p: 3,
    bg: 'gray.50',
    color: 'gray.700',
    border: `1px solid ${resolveBorderColor(borderColor, useTheme())}`,
    fontWeight: 'semibold',
    textAlign: 'left',
    verticalAlign: 'top',
  });

  return (
    <th {...elementProps} style={styles}>
      {children}
    </th>
  );
}

export function TableCell({ borderColor, children, ...props }: TableCellProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    p: 3,
    border: `1px solid ${resolveBorderColor(borderColor, useTheme())}`,
    verticalAlign: 'top',
  });

  return (
    <td {...elementProps} style={styles}>
      {children}
    </td>
  );
}

export function TableCaption({ children, ...props }: TableCaptionProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    color: 'gray.600',
    fontSize: 'sm',
    textAlign: 'left',
    mb: 2,
  });

  return (
    <caption {...elementProps} style={styles}>
      {children}
    </caption>
  );
}

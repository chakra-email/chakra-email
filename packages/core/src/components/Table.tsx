import {
  getEmailStyleProps,
  updateEmailStyleModes,
} from '../system/color-mode.js';
import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { createContext, useContext } from 'react';
import {
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import {
  chakraEmailSlotRecipeKeys,
  useTheme,
  type RecipeSelection,
} from '../theme/index.js';
import { resolveBorderColor } from './Hr.js';
import { getLegacyWidthAttribute } from './layout-styles.js';

export interface TableProps
  extends
    BaseChakraEmailProps,
    Omit<TableHTMLAttributes<HTMLTableElement>, keyof BaseChakraEmailProps> {
  variant?: string;
  size?: string;
}

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

const TableRecipeContext = createContext<RecipeSelection | undefined>(
  undefined,
);

function useTableRecipeStyles() {
  return useSlotRecipeStyles(
    chakraEmailSlotRecipeKeys.table,
    useContext(TableRecipeContext),
  );
}

export function Table({ variant, size, children, ...props }: TableProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeSelection = { variant, size };
  const recipeStyles = useSlotRecipeStyles(
    chakraEmailSlotRecipeKeys.table,
    recipeSelection,
  );
  const styles = mergeInlineStyles(
    recipeStyles.root,
    useChakraStyles(styleProps),
  );
  const legacyWidth = getLegacyWidthAttribute(styles.width) ?? '100%';

  return (
    <table
      data-text-format="dataTable"
      {...elementProps}
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width={legacyWidth}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      <TableRecipeContext.Provider value={recipeSelection}>
        {children}
      </TableRecipeContext.Provider>
    </table>
  );
}

export function TableHead({ children, ...props }: TableHeadProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useTableRecipeStyles();
  const styles = mergeInlineStyles(
    recipeStyles.header,
    useChakraStyles(styleProps),
  );

  return (
    <thead
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children, ...props }: TableBodyProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useTableRecipeStyles();
  const styles = mergeInlineStyles(
    recipeStyles.body,
    useChakraStyles(styleProps),
  );

  return (
    <tbody
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </tbody>
  );
}

export function TableFoot({ children, ...props }: TableFootProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useTableRecipeStyles();
  const styles = mergeInlineStyles(
    recipeStyles.footer,
    useChakraStyles(styleProps),
  );

  return (
    <tfoot
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({ children, ...props }: TableRowProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useTableRecipeStyles();
  const styles = mergeInlineStyles(
    recipeStyles.row,
    useChakraStyles(styleProps),
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

export function TableHeader({
  borderColor,
  children,
  ...props
}: TableHeaderProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const theme = useTheme();
  const recipeStyles = useTableRecipeStyles();
  const styles = mergeInlineStyles(
    recipeStyles.columnHeader,
    useChakraStyles(borderColor ? { borderColor, ...styleProps } : styleProps),
  );
  updateEmailStyleModes(styles, (value) => {
    value.border ??= `1px solid ${value.borderColor ?? resolveBorderColor(undefined, theme)}`;
    delete value.borderColor;
  });

  return (
    <th
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </th>
  );
}

export function TableCell({ borderColor, children, ...props }: TableCellProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const theme = useTheme();
  const recipeStyles = useTableRecipeStyles();
  const styles = mergeInlineStyles(
    recipeStyles.cell,
    useChakraStyles(borderColor ? { borderColor, ...styleProps } : styleProps),
  );
  updateEmailStyleModes(styles, (value) => {
    value.border ??= `1px solid ${value.borderColor ?? resolveBorderColor(undefined, theme)}`;
    delete value.borderColor;
  });

  return (
    <td
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </td>
  );
}

export function TableCaption({ children, ...props }: TableCaptionProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useTableRecipeStyles();
  const styles = mergeInlineStyles(
    recipeStyles.caption,
    useChakraStyles(styleProps),
  );

  return (
    <caption
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </caption>
  );
}

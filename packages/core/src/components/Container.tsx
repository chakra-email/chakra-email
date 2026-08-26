import type { TableHTMLAttributes } from 'react';
import {
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailSlotRecipeKeys } from '../theme/index.js';
import {
  getLegacyWidthAttribute,
  paddingStyleKeys,
  splitStyles,
} from './layout-styles.js';

export interface ContainerProps
  extends
    BaseChakraEmailProps,
    Omit<
      TableHTMLAttributes<HTMLTableElement>,
      keyof BaseChakraEmailProps | 'align'
    > {
  maxW?: string | number;
  centerContent?: boolean;
}

export function Container({
  maxW,
  centerContent = true,
  children,
  ...props
}: ContainerProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useSlotRecipeStyles(chakraEmailSlotRecipeKeys.container);
  const instanceStyles = useChakraStyles({ maxW, ...styleProps });
  const [tableOverrides, cellOverrides] = splitStyles(
    instanceStyles,
    paddingStyleKeys,
  );
  const tableStyles = mergeInlineStyles(recipeStyles.root, tableOverrides);
  const cellStyles = mergeInlineStyles(recipeStyles.cell, cellOverrides);
  const legacyWidth =
    getLegacyWidthAttribute(
      tableStyles.width === '100%' ? tableStyles.maxWidth : tableStyles.width,
    ) ??
    getLegacyWidthAttribute(tableStyles.width) ??
    '100%';

  const legacyBackgroundAttribute = tableStyles.backgroundColor
    ? { bgcolor: tableStyles.backgroundColor.toString() }
    : {};

  return (
    <table
      {...elementProps}
      {...legacyBackgroundAttribute}
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      border={0}
      width={legacyWidth}
      align={centerContent ? 'center' : undefined}
      style={tableStyles}
    >
      <tbody>
        <tr>
          <td style={cellStyles}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

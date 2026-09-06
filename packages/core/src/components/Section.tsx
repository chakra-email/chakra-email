import { getEmailStyleProps } from '../system/color-mode.js';
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

export interface SectionProps
  extends
    BaseChakraEmailProps,
    Omit<TableHTMLAttributes<HTMLTableElement>, keyof BaseChakraEmailProps> {}

export function Section({ children, ...props }: SectionProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useSlotRecipeStyles(chakraEmailSlotRecipeKeys.section);
  const instanceStyles = useChakraStyles(styleProps);
  const [tableOverrides, cellOverrides] = splitStyles(
    instanceStyles,
    paddingStyleKeys,
  );
  const tableStyles = mergeInlineStyles(recipeStyles.root, tableOverrides);
  const cellStyles = mergeInlineStyles(recipeStyles.cell, cellOverrides);
  const legacyWidth = getLegacyWidthAttribute(tableStyles.width) ?? '100%';

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
      {...getEmailStyleProps(tableStyles, elementProps.className)}
    >
      <tbody>
        <tr>
          <td {...getEmailStyleProps(cellStyles)}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

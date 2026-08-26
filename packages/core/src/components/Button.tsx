import type { AnchorHTMLAttributes, CSSProperties } from 'react';
import {
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailSlotRecipeKeys } from '../theme/index.js';
import { getMsoPaddingAlt, splitStyles } from './layout-styles.js';
import { sanitizeHref } from './Link.js';

export interface ButtonProps
  extends
    BaseChakraEmailProps,
    Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      keyof BaseChakraEmailProps | 'href' | 'size'
    > {
  href: string;
  variant?: 'solid' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
}

const buttonCellStyleKeys = [
  'background',
  'backgroundColor',
  'border',
  'borderColor',
  'borderWidth',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderRadius',
] as const satisfies ReadonlyArray<keyof CSSProperties>;

const buttonMarginStyleKeys = [
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
] as const satisfies ReadonlyArray<keyof CSSProperties>;

export function Button({
  href,
  variant = 'solid',
  size = 'md',
  align = 'left',
  children,
  ...props
}: ButtonProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useSlotRecipeStyles(chakraEmailSlotRecipeKeys.button, {
    size,
    variant,
  });
  const instanceStyles = useChakraStyles(styleProps);
  const [anchorAndMarginOverrides, cellOverrides] = splitStyles(
    instanceStyles,
    buttonCellStyleKeys,
  );
  const [anchorOverrides, tableOverrides] = splitStyles(
    anchorAndMarginOverrides,
    buttonMarginStyleKeys,
  );

  const tableStyles = mergeInlineStyles(recipeStyles.root, tableOverrides);
  const cellStyles = mergeInlineStyles(recipeStyles.cell, cellOverrides);
  const anchorStyles = mergeInlineStyles(recipeStyles.link, anchorOverrides);

  if (variant === 'outline' && !cellStyles.border) {
    cellStyles.border = `1px solid ${cellStyles.borderColor ?? anchorStyles.color ?? '#6366f1'}`;
  }

  const outlookPadding = getMsoPaddingAlt(anchorStyles);
  const outlookCellStyles: CSSProperties & { msoPaddingAlt?: string } = {
    ...cellStyles,
    ...(outlookPadding ? { msoPaddingAlt: outlookPadding } : {}),
  };
  anchorStyles.display ??= 'inline-block';
  anchorStyles.textDecoration ??= 'none';
  const legacyBackgroundAttribute = cellStyles.backgroundColor
    ? { bgcolor: cellStyles.backgroundColor.toString() }
    : {};

  return (
    <table
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      border={0}
      align={align}
      style={tableStyles}
    >
      <tbody>
        <tr>
          <td
            {...legacyBackgroundAttribute}
            align="center"
            style={outlookCellStyles}
          >
            <a {...elementProps} href={sanitizeHref(href)} style={anchorStyles}>
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

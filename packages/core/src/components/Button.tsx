import {
  getEmailStyleProps,
  updateEmailStyleModes,
} from '../system/color-mode.js';
import type { AnchorHTMLAttributes, CSSProperties } from 'react';
import {
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailSlotRecipeKeys } from '../theme/index.js';
import { useEmailUrlPolicy, type EmailUrlPolicy } from '../security/index.js';
import { getMsoPaddingAlt, splitStyles } from './layout-styles.js';

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
  urlPolicy?: EmailUrlPolicy;
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
  urlPolicy,
  children,
  ...props
}: ButtonProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const sanitizeUrl = useEmailUrlPolicy('link', urlPolicy);
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

  updateEmailStyleModes(cellStyles, (styles) => {
    if (variant === 'outline' && !styles.border)
      styles.border = `1px solid ${styles.borderColor ?? 'currentColor'}`;
  });

  const outlookPadding = getMsoPaddingAlt(anchorStyles);
  const outlookCellStyles = mergeInlineStyles(
    cellStyles,
    outlookPadding ? ({ msoPaddingAlt: outlookPadding } as CSSProperties) : {},
  );
  updateEmailStyleModes(anchorStyles, (styles) => {
    styles.display ??= 'inline-block';
    styles.textDecoration ??= 'none';
  });
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
      {...getEmailStyleProps(tableStyles)}
    >
      <tbody>
        <tr>
          <td
            {...legacyBackgroundAttribute}
            align="center"
            {...getEmailStyleProps(outlookCellStyles)}
          >
            <a
              {...elementProps}
              href={sanitizeUrl(href)}
              {...getEmailStyleProps(anchorStyles, elementProps.className)}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

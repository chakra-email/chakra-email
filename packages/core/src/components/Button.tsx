import type { AnchorHTMLAttributes, CSSProperties } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
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

const sizeProps = {
  sm: { px: 4, py: 2, fontSize: 'sm' },
  md: { px: 6, py: 3, fontSize: 'md' },
  lg: { px: 8, py: 4, fontSize: 'lg' },
} as const;

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

export function Button({
  href,
  variant = 'solid',
  size = 'md',
  align = 'left',
  children,
  ...props
}: ButtonProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles({
    bg: variant === 'solid' ? 'brand.500' : 'transparent',
    color: variant === 'solid' ? 'white' : 'brand.500',
    rounded: 'md',
    fontFamily: 'body',
    fontWeight: 'semibold',
    lineHeight: 'none',
    textAlign: 'center',
    textDecoration: variant === 'link' ? 'underline' : 'none',
    ...sizeProps[size],
    ...styleProps,
  });

  if (variant === 'outline' && !styles.border) {
    styles.border = `1px solid ${styles.borderColor ?? styles.color ?? '#6366f1'}`;
  }

  if (variant === 'link') {
    styles.padding = 0;
    delete styles.paddingTop;
    delete styles.paddingRight;
    delete styles.paddingBottom;
    delete styles.paddingLeft;
    styles.backgroundColor = 'transparent';
    styles.border = 'none';
  }

  const tableStyles: CSSProperties = {
    borderCollapse: 'separate',
    margin: styles.margin,
    marginTop: styles.marginTop,
    marginRight: styles.marginRight,
    marginBottom: styles.marginBottom,
    marginLeft: styles.marginLeft,
  };

  // Margins are rendered on the outer table only; keeping them on the
  // inline-block anchor as well would apply them twice.
  const [anchorBaseStyles, cellStyles] = splitStyles(
    styles,
    buttonCellStyleKeys,
  );
  const outlookPadding = getMsoPaddingAlt(styles);
  const outlookCellStyles: CSSProperties & { msoPaddingAlt?: string } = {
    ...cellStyles,
    ...(outlookPadding ? { msoPaddingAlt: outlookPadding } : {}),
  };
  const anchorStyles: CSSProperties = {
    ...anchorBaseStyles,
    display: 'inline-block',
    textDecoration: styles.textDecoration ?? 'none',
  };
  delete anchorStyles.margin;
  delete anchorStyles.marginTop;
  delete anchorStyles.marginRight;
  delete anchorStyles.marginBottom;
  delete anchorStyles.marginLeft;
  const legacyBackgroundAttribute = styles.backgroundColor
    ? { bgcolor: styles.backgroundColor.toString() }
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

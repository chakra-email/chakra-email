import type { BlockquoteHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { useTheme } from '../theme/index.js';
import { resolveBorderColor } from './Hr.js';

export interface BlockquoteProps
  extends
    BaseChakraEmailProps,
    Omit<
      BlockquoteHTMLAttributes<HTMLQuoteElement>,
      keyof BaseChakraEmailProps
    > {}

export function Blockquote({
  borderColor,
  children,
  ...props
}: BlockquoteProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const borderLeftColor = resolveBorderColor(borderColor, useTheme());
  const styles = useChakraStyles(styleProps, {
    m: '0 0 16px',
    pl: 4,
    color: 'gray.700',
    borderLeft: `4px solid ${borderLeftColor}`,
  });

  return (
    <blockquote {...elementProps} style={styles}>
      {children}
    </blockquote>
  );
}

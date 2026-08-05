import type { HTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

export interface CodeProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLElement>, keyof BaseChakraEmailProps> {}

export function Code({ children, ...props }: CodeProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    bg: 'gray.100',
    color: 'gray.800',
    px: 1,
    py: 0,
    rounded: 'sm',
    fontFamily: 'mono',
    fontSize: 'sm',
    style: {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    },
  });

  return (
    <code {...elementProps} style={styles}>
      {children}
    </code>
  );
}

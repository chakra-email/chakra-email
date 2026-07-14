import type { HTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

export interface PreProps
  extends BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLPreElement>, keyof BaseChakraEmailProps> {}

export function Pre({ children, ...props }: PreProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const { style, ...chakraStyleProps } = styleProps;
  const styles = useChakraStyles({
    m: '0 0 16px',
    p: 4,
    bg: 'gray.100',
    color: 'gray.800',
    borderRadius: 'md',
    fontFamily: 'mono',
    fontSize: 'sm',
    lineHeight: 'base',
    ...chakraStyleProps,
    style: {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      ...style,
    },
  });

  return (
    <pre {...elementProps} style={styles}>
      {children}
    </pre>
  );
}

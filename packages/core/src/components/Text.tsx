import type { ElementType } from 'react';
import { splitStyleProps, useChakraStyles, type BaseChakraEmailProps } from '../system/index.js';

export interface TextProps extends BaseChakraEmailProps {
  as?: 'p' | 'span' | 'div';
}

export function Text({ as: Component = 'p', children, ...props }: TextProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles({
    m: '0 0 16px',
    fontSize: 'md',
    lineHeight: 'base',
    ...styleProps,
  });
  const TextElement = Component as ElementType;

  return (
    <TextElement {...elementProps} style={styles}>
      {children}
    </TextElement>
  );
}

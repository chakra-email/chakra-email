import type { ElementType } from 'react';
import { splitStyleProps, useChakraStyles, type BaseChakraEmailProps } from '../system/index.js';

export interface BoxProps extends BaseChakraEmailProps {
  as?: 'div' | 'span' | 'table' | 'tbody' | 'tr' | 'td';
}

export function Box({ as: Component = 'div', children, ...props }: BoxProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);
  const BoxElement = Component as ElementType;

  return (
    <BoxElement {...elementProps} style={styles}>
      {children}
    </BoxElement>
  );
}

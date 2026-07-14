import type { ComponentPropsWithoutRef, ElementType } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

type BoxElement = 'div' | 'span' | 'table' | 'tbody' | 'tr' | 'td';

export type BoxProps<T extends BoxElement = 'div'> = BaseChakraEmailProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof BaseChakraEmailProps | 'as'>;

export function Box<T extends BoxElement = 'div'>({
  as: Component = 'div' as T,
  children,
  ...props
}: BoxProps<T>) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);
  const BoxElement = Component as ElementType;

  return (
    <BoxElement {...elementProps} style={styles}>
      {children}
    </BoxElement>
  );
}

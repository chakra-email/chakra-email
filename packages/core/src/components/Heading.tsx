import type { ElementType } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export interface HeadingProps extends BaseChakraEmailProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function Heading({
  as: Component = 'h1',
  children,
  ...props
}: HeadingProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.heading,
    { level: Component },
    styleProps,
  );
  const HeadingElement = Component as ElementType;

  return (
    <HeadingElement {...elementProps} style={styles}>
      {children}
    </HeadingElement>
  );
}

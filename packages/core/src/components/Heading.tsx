import type { ElementType } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

export interface HeadingProps extends BaseChakraEmailProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const defaultFontSizes: Record<NonNullable<HeadingProps['as']>, string> = {
  h1: '3xl',
  h2: '2xl',
  h3: 'xl',
  h4: 'lg',
  h5: 'md',
  h6: 'sm',
};

export function Heading({
  as: Component = 'h1',
  children,
  ...props
}: HeadingProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    m: '0 0 16px',
    fontFamily: 'heading',
    fontSize: defaultFontSizes[Component],
    fontWeight: 'bold',
    lineHeight: 'short',
  });
  const HeadingElement = Component as ElementType;

  return (
    <HeadingElement {...elementProps} style={styles}>
      {children}
    </HeadingElement>
  );
}

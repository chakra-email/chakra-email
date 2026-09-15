import { getEmailStyleProps } from '../system/color-mode.js';
import type { ElementType } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export interface TextProps extends BaseChakraEmailProps {
  as?: 'p' | 'span' | 'div';
}

export function Text({ as: Component = 'p', children, ...props }: TextProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.text,
    undefined,
    styleProps,
  );
  const TextElement = Component as ElementType;

  return (
    <TextElement
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </TextElement>
  );
}

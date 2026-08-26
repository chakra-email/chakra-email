import type { HTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export interface PreProps
  extends
    BaseChakraEmailProps,
    Omit<HTMLAttributes<HTMLPreElement>, keyof BaseChakraEmailProps> {}

export function Pre({ children, ...props }: PreProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.pre,
    undefined,
    styleProps,
  );

  return (
    <pre {...elementProps} style={styles}>
      {children}
    </pre>
  );
}

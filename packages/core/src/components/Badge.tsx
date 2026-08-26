import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export type BadgeProps = BaseChakraEmailProps;

export function Badge({ children, ...props }: BadgeProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.badge,
    undefined,
    styleProps,
  );

  return (
    <span {...elementProps} style={styles}>
      {children}
    </span>
  );
}

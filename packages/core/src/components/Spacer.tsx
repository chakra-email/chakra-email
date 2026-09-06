import { getEmailStyleProps } from '../system/color-mode.js';
import {
  resolveSpacing,
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys, useTheme } from '../theme/index.js';

export interface SpacerProps extends Omit<BaseChakraEmailProps, 'children'> {
  size?: string | number;
}

export function Spacer({ size = 4, ...props }: SpacerProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  // Spacer sizes are spacing values, so resolve them through the `space`
  // scale (size={3} → 12px) rather than the `sizes` scale.
  const resolvedSize = resolveSpacing(size, useTheme());
  const styles = useRecipeStyles(chakraEmailRecipeKeys.spacer, undefined, {
    h: resolvedSize,
    lineHeight: resolvedSize,
    ...styleProps,
  });

  return (
    <div
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      &nbsp;
    </div>
  );
}

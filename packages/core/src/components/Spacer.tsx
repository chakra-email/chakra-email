import {
  resolveSpacing,
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { useTheme } from '../theme/index.js';

export interface SpacerProps extends Omit<BaseChakraEmailProps, 'children'> {
  size?: string | number;
}

export function Spacer({ size = 4, ...props }: SpacerProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  // Spacer sizes are spacing values, so resolve them through the `space`
  // scale (size={3} → 12px) rather than the `sizes` scale.
  const resolvedSize = resolveSpacing(size, useTheme());
  const styles = useChakraStyles({
    h: resolvedSize,
    lineHeight: resolvedSize,
    fontSize: 0,
    ...styleProps,
  });

  return (
    <div {...elementProps} style={styles}>
      &nbsp;
    </div>
  );
}

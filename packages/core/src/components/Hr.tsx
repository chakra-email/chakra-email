import {
  resolveColor,
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { useTheme, type EmailTheme } from '../theme/index.js';

const fallbackBorderColor = '#E2E8F0';

/**
 * Resolves a border color through the theme, defaulting to the `gray.200`
 * token so theme overrides flow into bordered components. Falls back to
 * `#E2E8F0` only when the default token is missing from the theme.
 */
export function resolveBorderColor(
  borderColor: string | undefined,
  theme: EmailTheme,
): string {
  if (borderColor) {
    return resolveColor(borderColor, theme) ?? borderColor;
  }

  const resolved = resolveColor('gray.200', theme);
  return resolved && resolved !== 'gray.200' ? resolved : fallbackBorderColor;
}

export type HrProps = BaseChakraEmailProps;

export function Hr({ borderColor, ...props }: HrProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const borderTopColor = resolveBorderColor(borderColor, useTheme());
  const styles = useChakraStyles(styleProps, {
    m: '16px 0',
    border: 'none',
    borderTop: `1px solid ${borderTopColor}`,
    w: 'full',
  });

  return <hr {...elementProps} style={styles} />;
}

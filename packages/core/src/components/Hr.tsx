import {
  getEmailStyleProps,
  updateEmailStyleModes,
} from '../system/color-mode.js';
import {
  resolveColor,
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import {
  chakraEmailRecipeKeys,
  useTheme,
  type EmailTheme,
} from '../theme/index.js';

const fallbackBorderColor = '#E2E8F0';

/**
 * Resolves a border color through the theme, defaulting to the semantic
 * `border` token so system-level overrides flow into bordered components.
 * Falls back to `#E2E8F0` only when the default token is missing.
 */
export function resolveBorderColor(
  borderColor: string | undefined,
  theme: EmailTheme,
): string {
  if (borderColor) {
    return resolveColor(borderColor, theme) ?? borderColor;
  }

  const resolved = resolveColor('border', theme);
  return resolved && resolved !== 'border' ? resolved : fallbackBorderColor;
}

export type HrProps = BaseChakraEmailProps;

export function Hr({ borderColor, ...props }: HrProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const theme = useTheme();
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.hr,
    undefined,
    borderColor ? { borderColor, ...styleProps } : styleProps,
  );
  updateEmailStyleModes(styles, (value) => {
    value.borderTop ??= `1px solid ${value.borderColor ?? resolveBorderColor(undefined, theme)}`;
    delete value.borderColor;
  });

  return (
    <hr
      {...elementProps}
      {...getEmailStyleProps(styles, elementProps.className)}
    />
  );
}

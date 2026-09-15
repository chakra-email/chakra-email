import { getEmailStyleProps } from '../system/color-mode.js';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export type BodyProps = BaseChakraEmailProps;

export function Body({ children, ...props }: BodyProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.body,
    undefined,
    styleProps,
  );

  const legacyBackgroundAttribute = styles.backgroundColor
    ? { bgcolor: styles.backgroundColor.toString() }
    : {};

  return (
    <body
      {...elementProps}
      {...legacyBackgroundAttribute}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </body>
  );
}

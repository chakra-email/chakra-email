import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

export type BodyProps = BaseChakraEmailProps;

export function Body({ children, ...props }: BodyProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    m: 0,
    p: 0,
    fontFamily: 'body',
    w: 'full',
  });

  const legacyBackgroundAttribute = styles.backgroundColor
    ? { bgcolor: styles.backgroundColor.toString() }
    : {};

  return (
    <body {...elementProps} {...legacyBackgroundAttribute} style={styles}>
      {children}
    </body>
  );
}

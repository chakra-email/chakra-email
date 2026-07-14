import { splitStyleProps, useChakraStyles, type BaseChakraEmailProps } from '../system/index.js';

export type RowProps = BaseChakraEmailProps;

export function Row({ children, ...props }: RowProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);

  return (
    <tr {...elementProps} style={styles}>
      {children}
    </tr>
  );
}

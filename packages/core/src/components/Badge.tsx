import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

export type BadgeProps = BaseChakraEmailProps;

export function Badge({ children, ...props }: BadgeProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles({
    bg: 'gray.100',
    color: 'gray.700',
    px: 2,
    py: 1,
    borderRadius: 'sm',
    fontSize: 'xs',
    fontWeight: 'semibold',
    lineHeight: 'none',
    textTransform: 'uppercase',
    ...styleProps,
  });

  return (
    <span {...elementProps} style={styles}>
      {children}
    </span>
  );
}

import type { HTMLAttributes, LiHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

export interface ListProps
  extends
    BaseChakraEmailProps,
    Omit<
      HTMLAttributes<HTMLUListElement | HTMLOListElement>,
      keyof BaseChakraEmailProps
    > {
  as?: 'ul' | 'ol';
}

export interface ListItemProps
  extends
    BaseChakraEmailProps,
    Omit<LiHTMLAttributes<HTMLLIElement>, keyof BaseChakraEmailProps> {}

export function List({ as: Component = 'ul', children, ...props }: ListProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    m: '0 0 16px',
    pl: 6,
  });

  return (
    <Component {...elementProps} style={styles}>
      {children}
    </Component>
  );
}

export function ListItem({ children, ...props }: ListItemProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps, {
    mb: 2,
  });

  return (
    <li {...elementProps} style={styles}>
      {children}
    </li>
  );
}

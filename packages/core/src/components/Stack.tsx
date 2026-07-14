import { Children, type ReactNode, type TableHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { Spacer } from './Spacer.js';

export interface StackProps
  extends
    BaseChakraEmailProps,
    Omit<TableHTMLAttributes<HTMLTableElement>, keyof BaseChakraEmailProps> {
  spacing?: string | number;
  divider?: ReactNode;
}

export function Stack({
  spacing = 4,
  divider,
  children,
  ...props
}: StackProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles({
    width: 'full',
    ...styleProps,
  });
  const items = Children.toArray(children).filter((item) => item !== '');

  return (
    <table
      {...elementProps}
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      border={0}
      width="100%"
      style={styles}
    >
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td>
              {item}
              {index < items.length - 1 && (
                <>
                  {divider}
                  <Spacer size={spacing} />
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

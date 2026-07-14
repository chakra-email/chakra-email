import type { TableHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import {
  getLegacyWidthAttribute,
  paddingStyleKeys,
  splitStyles,
} from './layout-styles.js';

export interface ContainerProps
  extends
    BaseChakraEmailProps,
    Omit<
      TableHTMLAttributes<HTMLTableElement>,
      keyof BaseChakraEmailProps | 'align'
    > {
  maxW?: string | number;
  centerContent?: boolean;
}

export function Container({
  maxW = '600px',
  centerContent = true,
  children,
  ...props
}: ContainerProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const resolvedStyles = useChakraStyles({
    width: 'full',
    maxW,
    ...styleProps,
  });
  const [tableStyles, cellStyles] = splitStyles(
    resolvedStyles,
    paddingStyleKeys,
  );
  const legacyWidth =
    getLegacyWidthAttribute(
      tableStyles.width === '100%' ? tableStyles.maxWidth : tableStyles.width,
    ) ??
    getLegacyWidthAttribute(tableStyles.width) ??
    '100%';

  const legacyBackgroundAttribute = tableStyles.backgroundColor
    ? { bgcolor: tableStyles.backgroundColor.toString() }
    : {};

  return (
    <table
      {...elementProps}
      {...legacyBackgroundAttribute}
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      border={0}
      width={legacyWidth}
      align={centerContent ? 'center' : undefined}
      style={tableStyles}
    >
      <tbody>
        <tr>
          <td style={cellStyles}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

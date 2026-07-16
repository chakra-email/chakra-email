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

export interface SectionProps
  extends
    BaseChakraEmailProps,
    Omit<TableHTMLAttributes<HTMLTableElement>, keyof BaseChakraEmailProps> {}

export function Section({ children, ...props }: SectionProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const resolvedStyles = useChakraStyles({
    w: 'full',
    ...styleProps,
  });
  const [tableStyles, cellStyles] = splitStyles(
    resolvedStyles,
    paddingStyleKeys,
  );
  const legacyWidth = getLegacyWidthAttribute(tableStyles.width) ?? '100%';

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

import { Children, type ReactNode, type TableHTMLAttributes } from 'react';
import {
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailSlotRecipeKeys } from '../theme/index.js';
import { getLegacyWidthAttribute } from './layout-styles.js';
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
  const recipeStyles = useSlotRecipeStyles(chakraEmailSlotRecipeKeys.stack);
  const styles = mergeInlineStyles(
    recipeStyles.root,
    useChakraStyles(styleProps),
  );
  const items = Children.toArray(children).filter((item) => item !== '');
  const legacyWidth = getLegacyWidthAttribute(styles.width) ?? '100%';

  return (
    <table
      {...elementProps}
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      border={0}
      width={legacyWidth}
      style={styles}
    >
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td style={recipeStyles.item}>
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

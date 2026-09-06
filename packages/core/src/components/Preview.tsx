import { getEmailStyleProps } from '../system/color-mode.js';
import type { ReactNode } from 'react';
import {
  mergeInlineStyles,
  splitStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailSlotRecipeKeys } from '../theme/index.js';

export interface PreviewProps extends Omit<BaseChakraEmailProps, 'children'> {
  children: ReactNode;
}

export function Preview({ children, ...props }: PreviewProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const recipeStyles = useSlotRecipeStyles(chakraEmailSlotRecipeKeys.preview);
  const rootStyles = mergeInlineStyles(
    recipeStyles.root,
    useChakraStyles(styleProps),
  );

  return (
    <div
      {...elementProps}
      aria-hidden="true"
      {...getEmailStyleProps(rootStyles, elementProps.className)}
    >
      {children}
      <span {...getEmailStyleProps(recipeStyles.spacer)}>
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
      </span>
    </div>
  );
}

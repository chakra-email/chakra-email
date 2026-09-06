import { getEmailStyleProps } from '../system/color-mode.js';
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';
import { Body, type BodyProps } from './Body.js';
import { Preview } from './Preview.js';

export interface HtmlProps extends BaseChakraEmailProps {
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

function placePreviewsInBody(children: ReactNode): ReactNode {
  const childArray = Children.toArray(children);
  const previews = childArray.filter(
    (child) => isValidElement(child) && child.type === Preview,
  );

  if (previews.length === 0) {
    return children;
  }

  const bodyIndex = childArray.findIndex(
    (child) => isValidElement(child) && child.type === Body,
  );

  if (bodyIndex === -1) {
    return children;
  }

  const body = childArray[bodyIndex] as ReactElement<BodyProps>;
  childArray[bodyIndex] = cloneElement(
    body,
    undefined,
    ...previews,
    body.props.children,
  );

  return childArray.filter(
    (child) => !(isValidElement(child) && child.type === Preview),
  );
}

export function Html({ lang = 'en', dir, children, ...props }: HtmlProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.html,
    undefined,
    styleProps,
  );

  return (
    <html
      {...elementProps}
      lang={lang}
      dir={dir}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {placePreviewsInBody(children)}
    </html>
  );
}

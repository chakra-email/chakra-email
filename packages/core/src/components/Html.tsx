import type { CSSProperties } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';

export interface HtmlProps extends BaseChakraEmailProps {
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

export function Html({ lang = 'en', dir, children, ...props }: HtmlProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(styleProps);

  return (
    <html
      {...elementProps}
      lang={lang}
      dir={dir}
      style={styles as CSSProperties}
    >
      {children}
    </html>
  );
}

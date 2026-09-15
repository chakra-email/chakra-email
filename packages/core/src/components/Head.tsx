import { Children, isValidElement, type ReactNode } from 'react';
import { useEmailColorModeRender } from '../system/color-mode.js';
import { useTheme } from '../theme/theme-context.js';

export interface HeadProps {
  children?: ReactNode;
}

export function Head({ children }: HeadProps) {
  const theme = useTheme();
  const render = useEmailColorModeRender();
  const mode =
    render?.mode && render.mode !== 'system'
      ? render.mode
      : (theme.colorMode ?? 'system');
  const scheme = mode === 'system' ? 'light dark' : mode;
  const hasMeta = (name: string) =>
    Children.toArray(children).some(
      (child) =>
        isValidElement<{ name?: string }>(child) &&
        child.type === 'meta' &&
        child.props.name === name,
    );
  return (
    <head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {!hasMeta('color-scheme') && (
        <meta name="color-scheme" content={scheme} />
      )}
      {!hasMeta('supported-color-schemes') && (
        <meta name="supported-color-schemes" content={scheme} />
      )}
      {children}
    </head>
  );
}

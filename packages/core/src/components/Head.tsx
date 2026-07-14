import type { ReactNode } from 'react';

export interface HeadProps {
  children?: ReactNode;
}

export function Head({ children }: HeadProps) {
  return (
    <head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {children}
    </head>
  );
}

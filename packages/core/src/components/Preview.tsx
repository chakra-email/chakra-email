import type { ReactNode } from 'react';

export interface PreviewProps {
  children: ReactNode;
}

export function Preview({ children }: PreviewProps) {
  return (
    <div
      style={{
        display: 'none',
        fontSize: '1px',
        color: '#ffffff',
        lineHeight: '1px',
        maxHeight: '0px',
        maxWidth: '0px',
        overflow: 'hidden',
      }}
    >
      {children}
      <span style={{ display: 'none' }}>
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
      </span>
    </div>
  );
}

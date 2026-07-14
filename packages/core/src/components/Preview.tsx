import type { CSSProperties, ReactNode } from 'react';

export interface PreviewProps {
  children: ReactNode;
}

type OutlookPreviewStyles = CSSProperties & {
  msoHide: 'all';
};

const hiddenPreviewStyles: OutlookPreviewStyles = {
  display: 'none',
  fontSize: '1px',
  color: '#ffffff',
  lineHeight: '1px',
  maxHeight: '0px',
  maxWidth: '0px',
  overflow: 'hidden',
  visibility: 'hidden',
  opacity: 0,
  msoHide: 'all',
};

const hiddenPreviewSpacerStyles: OutlookPreviewStyles = {
  display: 'none',
  msoHide: 'all',
};

export function Preview({ children }: PreviewProps) {
  return (
    <div aria-hidden="true" style={hiddenPreviewStyles}>
      {children}
      <span style={hiddenPreviewSpacerStyles}>
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
      </span>
    </div>
  );
}

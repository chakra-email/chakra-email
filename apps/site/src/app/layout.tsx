import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://chakra.email'),
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E',
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://kits.fontstack.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://kits.fontstack.com/kit/o0v0t0oi.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

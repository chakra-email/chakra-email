'use client';

import { createContext, useContext, type ReactNode } from 'react';

const NavigationContext = createContext<(href: string) => void>(() => {
  throw new Error('Site navigation requires SiteNavigationProvider.');
});

export function SiteNavigationProvider({
  navigate,
  children,
}: {
  navigate: (href: string) => void;
  children: ReactNode;
}) {
  return (
    <NavigationContext.Provider value={navigate}>
      {children}
    </NavigationContext.Provider>
  );
}
export const useNavigate = () => useContext(NavigationContext);

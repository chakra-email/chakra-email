import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getSitePathname, toSiteHref } from './routing';

const NavigationContext = createContext<(href: string) => void>(() => {
  throw new Error('SiteLink requires SiteNavigationProvider.');
});

export function scrollToLocation(href: string) {
  const hash = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';
  requestAnimationFrame(() => {
    if (!hash) {
      window.scrollTo?.({ top: 0 });
      return;
    }
    try {
      document.getElementById(decodeURIComponent(hash))?.scrollIntoView?.();
    } catch {
      /* Invalid fragments cannot break navigation. */
    }
  });
}

export function useSiteNavigation() {
  const [pathname, setPathname] = useState(() =>
    getSitePathname(window.location.pathname),
  );
  useEffect(() => {
    const handlePopState = () => {
      setPathname(getSitePathname(window.location.pathname));
      scrollToLocation(window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const navigate = useCallback((href: string) => {
    const url = new URL(toSiteHref(href), window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url);
      return;
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setPathname(getSitePathname(url.pathname));
    scrollToLocation(url.href);
  }, []);
  return { pathname, navigate };
}

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

/** Keep application links and static artwork aligned with Vite's deployment base. */
export function toSiteHref(
  href: string,
  base = import.meta.env.BASE_URL,
): string {
  if (!href.startsWith('/') || href.startsWith('//') || base === '/')
    return href;
  return `${base.replace(/\/$/, '')}${href}`;
}

export function getSitePathname(
  pathname: string,
  base = import.meta.env.BASE_URL,
): string {
  const prefix = base.replace(/\/$/, '');
  if (!prefix) return pathname;
  if (pathname === prefix) return '/';
  return pathname.startsWith(`${prefix}/`)
    ? pathname.slice(prefix.length)
    : pathname;
}

/** HTML capture routes only; .png endpoints belong to the image renderer. */
export function getSocialImagePageRoute(pathname: string): string | undefined {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/og-image') return '/';
  if (path.startsWith('/og-image/')) return path.slice('/og-image'.length);
  if (path === '/social-image') return '/';
  if (path.endsWith('/social-image'))
    return path.slice(0, -'/social-image'.length);
  return undefined;
}

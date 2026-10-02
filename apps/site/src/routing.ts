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

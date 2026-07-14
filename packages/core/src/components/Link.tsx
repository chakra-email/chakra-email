import type { AnchorHTMLAttributes } from 'react';
import { splitStyleProps, useChakraStyles, type BaseChakraEmailProps } from '../system/index.js';

export interface LinkProps
  extends BaseChakraEmailProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseChakraEmailProps> {
  href: string;
}

const SAFE_HREF_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);
const HREF_PROTOCOL_PATTERN = /^([a-z][a-z0-9+.-]*):/i;

/**
 * Returns absolute URLs using an explicitly supported protocol, fragments,
 * and relative URLs unchanged. All other absolute protocols are omitted.
 */
export function sanitizeHref(href: string | undefined): string | undefined {
  if (href === undefined) {
    return undefined;
  }

  // Strip whitespace and control characters (browsers ignore them when
  // parsing protocols) before checking case-insensitively.
  // eslint-disable-next-line no-control-regex -- control characters are matched intentionally
  const normalizedHref = href.replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
  const protocol = HREF_PROTOCOL_PATTERN.exec(normalizedHref)?.[1]?.toLowerCase();

  if (protocol !== undefined && !SAFE_HREF_PROTOCOLS.has(protocol)) {
    return undefined;
  }

  return href;
}

export function Link({ href, children, ...props }: LinkProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles({
    color: 'brand.500',
    textDecoration: 'underline',
    ...styleProps,
  });

  return (
    <a {...elementProps} href={sanitizeHref(href)} style={styles}>
      {children}
    </a>
  );
}

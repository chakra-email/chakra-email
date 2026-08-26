import type { AnchorHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';

export interface LinkProps
  extends
    BaseChakraEmailProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseChakraEmailProps> {
  href: string;
}

const SAFE_HREF_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);
const HREF_PROTOCOL_PATTERN = /^([a-z][a-z0-9+.-]*):/i;

/**
 * Returns absolute URLs using an explicitly supported protocol and fragments.
 * Relative URLs are omitted because delivered email has no sender-controlled
 * base URL and clients may otherwise resolve them against the webmail host.
 */
export function sanitizeHref(href: string | undefined): string | undefined {
  if (href === undefined) {
    return undefined;
  }

  const normalizedHref = href.trimStart();
  const protocol =
    HREF_PROTOCOL_PATTERN.exec(normalizedHref)?.[1]?.toLowerCase();

  if (normalizedHref.startsWith('#')) {
    return href;
  }

  if (protocol === undefined || !SAFE_HREF_PROTOCOLS.has(protocol)) {
    return undefined;
  }

  if (protocol === 'mailto' || protocol === 'tel') {
    return normalizedHref.slice(protocol.length + 1).trim() ? href : undefined;
  }

  if (!normalizedHref.toLowerCase().startsWith(`${protocol}://`)) {
    return undefined;
  }

  try {
    const url = new URL(normalizedHref);
    return url.protocol === `${protocol}:` && url.hostname ? href : undefined;
  } catch {
    return undefined;
  }
}

export function Link({ href, children, ...props }: LinkProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.link,
    undefined,
    styleProps,
  );

  return (
    <a {...elementProps} href={sanitizeHref(href)} style={styles}>
      {children}
    </a>
  );
}

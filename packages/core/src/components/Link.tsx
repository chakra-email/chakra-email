import { getEmailStyleProps } from '../system/color-mode.js';
import type { AnchorHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';
import {
  sanitizeEmailUrl,
  useEmailUrlPolicy,
  type EmailUrlPolicy,
} from '../security/index.js';

export interface LinkProps
  extends
    BaseChakraEmailProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseChakraEmailProps> {
  href: string;
  urlPolicy?: EmailUrlPolicy;
}

/**
 * Validates links with the strict default policy. Pass an override to opt into
 * additional protocols or fail-closed behavior.
 */
export function sanitizeHref(
  href: string | undefined,
  policy?: EmailUrlPolicy,
): string | undefined {
  return sanitizeEmailUrl(href, { kind: 'link', policy });
}

export function Link({ href, urlPolicy, children, ...props }: LinkProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const sanitizeUrl = useEmailUrlPolicy('link', urlPolicy);
  const styles = useRecipeStyles(
    chakraEmailRecipeKeys.link,
    undefined,
    styleProps,
  );

  return (
    <a
      {...elementProps}
      href={sanitizeUrl(href)}
      {...getEmailStyleProps(styles, elementProps.className)}
    >
      {children}
    </a>
  );
}

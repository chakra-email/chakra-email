'use client';

import { Link, type LinkProps } from '@chakra-ui/react';
import NextLink from 'next/link';

export function SiteLink({
  href,
  children,
  ...props
}: LinkProps & { href: string }) {
  if (
    !href.startsWith('/') ||
    href.startsWith('//') ||
    props.download != null
  ) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <Link asChild {...props}>
      <NextLink href={href}>{children}</NextLink>
    </Link>
  );
}

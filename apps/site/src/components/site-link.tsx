import { Link, type LinkProps } from '@chakra-ui/react';
import { useNavigate } from '../navigation';
import { toSiteHref } from '../routing';

export function SiteLink({
  href,
  onClick,
  target,
  download,
  ...props
}: LinkProps & { href: string }) {
  const navigate = useNavigate();
  return (
    <Link
      {...props}
      href={toSiteHref(href)}
      target={target}
      download={download}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          (target && target !== '_self') ||
          download != null ||
          /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)
        )
          return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}

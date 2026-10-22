import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { FathomProvider, useFathom, type FathomClient } from 'react-fathom';
import {
  createDocsAnalytics,
  getAnalyticsUrl,
  getFathomConfig,
} from '../analytics';
import { toSiteHref } from '../routing';
import { SITE_URL } from '../site-metadata';

function TrackNavigation({ pathname }: { pathname: string }) {
  const { client, trackPageview } = useFathom();
  const lastNavigation = useRef<{ url: string; client: unknown } | null>(null);
  useEffect(() => {
    const url = getAnalyticsUrl(
      new URL(toSiteHref(pathname), window.location.origin).href,
    );
    if (
      !client ||
      !url ||
      (lastNavigation.current?.url === url &&
        lastNavigation.current.client === client)
    )
      return;
    lastNavigation.current = { url, client };
    trackPageview({ url });
  }, [pathname, client, trackPageview]);
  return null;
}

export function Analytics({
  children,
  pathname,
  client,
}: {
  children: ReactNode;
  pathname: string;
  client?: FathomClient;
}) {
  const config = useMemo(
    () =>
      getFathomConfig(
        process.env.NEXT_PUBLIC_FATHOM_SITE_ID,
        process.env.NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN,
      ),
    [],
  );
  if (!config || !getAnalyticsUrl(new URL(toSiteHref(pathname), SITE_URL).href))
    return children;
  return (
    <FathomProvider {...config} client={client}>
      <TrackNavigation pathname={pathname} />
      {children}
    </FathomProvider>
  );
}

export function useDocsAnalytics() {
  const { client, trackEvent } = useFathom();
  const analytics = useMemo(
    () =>
      createDocsAnalytics((event) => {
        if (client) trackEvent(event);
      }),
    [client, trackEvent],
  );
  useEffect(() => analytics.cancelPendingSearchTracking, [analytics]);
  return analytics;
}

'use client';

import {
  DocsArticle,
  DocsBreadcrumbs,
  DocsLayout,
  DocsPageActions,
  DocsPagination,
  DocsProvider,
  type DocsLinkProps,
} from '@chakra-docs/chakra';
import type { DocsPage, DocsNavItem } from '@chakra-docs/core';
import { createChakraDocsShikiAdapter } from '@chakra-docs/shiki';
import {
  Box,
  ChakraProvider,
  Container,
  Flex,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react';
import { PostkitProvider } from '@postkit/react';
import { ThemeProvider } from 'next-themes';
import { type ReactNode, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { DocsMarkdown } from './components/docs-markdown';
import { DocsMobileControls } from './components/docs-mobile-controls';
import { ExamplesPage, PackagesPage } from './components/resource-pages';
import { SiteFooter, CommuneFooter } from './components/site-footer';
import { SiteLink } from './components/site-link';
import {
  SiteSearch,
  SiteShell,
  SearchRecommendations,
} from './components/site-shell';
import { WelcomePage } from './components/welcome-page';
import { WithOssPage } from './components/with-oss-page';
import { SiteNavigationProvider } from './navigation';
import { docsSystem } from './theme/system';
import { getSocialImagePageRoute, toSiteHref } from './routing';
import { OgImageCard } from './components/og-image-card';
import { getOgImageContent, OG_IMAGE_DEFAULTS } from './og-image';
import { Analytics, useDocsAnalytics } from './components/analytics';
import { SITE_URL } from './site-metadata';
import type { Example } from './content';
import type { RecommendedSearchResult } from './search-recommendations';

const adapter = createChakraDocsShikiAdapter({
  themes: { light: 'github-dark', dark: 'github-dark' },
});
function DocsLink(props: DocsLinkProps) {
  return <SiteLink {...props} />;
}

function DocumentationProvider({ children }: { children: ReactNode }) {
  const analytics = useDocsAnalytics();
  return (
    <DocsProvider
      config={{
        analytics,
        title: 'Chakra Email',
        linkComponent: DocsLink,
        pageActions: { size: 'sm' },
        layout: {
          stickyTop: docsSystem.token.var('spacing.docsStickyTop'),
          scrollMarginTop: docsSystem.token.var('spacing.docsScrollMargin'),
        },
        codeBlock: {
          adapter,
          copyIcon: <LuCopy aria-hidden="true" />,
          copiedIcon: <LuCheck aria-hidden="true" />,
        },
      }}
    >
      {children}
    </DocsProvider>
  );
}

function Article({
  page,
  children,
  documentation,
  nav,
}: {
  page: DocsPage;
  children: ReactNode;
  documentation?: boolean;
  nav: DocsNavItem[];
}) {
  return (
    <DocsLayout
      nav={nav}
      page={page}
      headings={page.headings}
      sidebarCollapsible
      sidebarDefaultExpanded="active"
      sidebarSlotProps={{ 'aria-label': 'Documentation pages' }}
      tocSlotProps={{ 'aria-label': 'On this page' }}
      mobileNavigation={false}
      mobileToc={false}
    >
      <DocsMobileControls nav={nav} page={page} search={<SiteSearch />} />
      <DocsArticle
        page={page}
        headings={page.headings}
        breadcrumbs={
          documentation ? (
            <Flex
              align="center"
              justify="space-between"
              columnGap={4}
              rowGap={3}
              wrap="wrap"
              w="full"
            >
              <DocsBreadcrumbs
                homeHref="/"
                homeLabel="Home"
                nav={nav}
                page={page}
              />
              <Box flexShrink={0} ms="auto">
                <DocsPageActions.Root
                  page={page}
                  pageUrl={new URL(toSiteHref(page.route), SITE_URL).href}
                  size="sm"
                  variant="split"
                  editUrl={String(page.frontmatter['sourceHref'])}
                />
              </Box>
            </Flex>
          ) : undefined
        }
      >
        {children}
        {documentation ? (
          <DocsPagination
            nav={nav.filter(
              (item) => item.id !== 'examples' && item.id !== 'packages',
            )}
            page={page}
            slotProps={{ 'aria-label': 'Documentation pagination' }}
          />
        ) : null}
      </DocsArticle>
    </DocsLayout>
  );
}

function CaptureCard({
  defaults,
}: {
  defaults: { title: string; description: string };
}) {
  const params = useSearchParams();
  return (
    <OgImageCard
      {...getOgImageContent(new URLSearchParams(params.toString()), defaults)}
    />
  );
}

export function App({
  page,
  nav,
  recommendations,
  year,
  examples = [],
  children,
}: {
  page?: DocsPage;
  nav: DocsNavItem[];
  recommendations: RecommendedSearchResult[];
  year: number;
  examples?: Example[];
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = (href: string) => router.push(href);
  const captureRoute = getSocialImagePageRoute(pathname);
  const route = captureRoute ?? pathname;
  const capture =
    captureRoute !== undefined && (page !== undefined || route === '/withoss');
  if (capture) {
    const defaults =
      route === '/'
        ? OG_IMAGE_DEFAULTS
        : route === '/withoss'
          ? {
              title: 'Made with OSS',
              description: 'The open-source software behind Chakra Email.',
            }
          : {
              title: page?.title ?? OG_IMAGE_DEFAULTS.title,
              description: page?.description ?? OG_IMAGE_DEFAULTS.description,
            };
    return (
      <ChakraProvider value={docsSystem}>
        <Suspense fallback={<OgImageCard {...defaults} captureReady={false} />}>
          <CaptureCard defaults={defaults} />
        </Suspense>
      </ChakraProvider>
    );
  }
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="chakra-email-site-color-mode"
    >
      <PostkitProvider
        system={docsSystem}
        codeBlockAdapter={adapter}
        codeBlock={{
          copyIcon: <LuCopy aria-hidden="true" />,
          copiedIcon: <LuCheck aria-hidden="true" />,
          copyLabel: null,
          copiedLabel: 'Copied!',
          copyAriaLabel: 'Copy code',
          copyFeedback: 'tooltip',
        }}
      >
        <Analytics pathname={pathname}>
          <SiteNavigationProvider navigate={navigate}>
            <SearchRecommendations.Provider value={recommendations}>
              <DocumentationProvider>
                <SiteShell footer={<SiteFooter year={year} />}>
                  {children}
                  {pathname === '/withoss' ? (
                    <WithOssPage />
                  ) : page ? (
                    <Article
                      page={page}
                      documentation={page.collectionId === 'docs'}
                      nav={nav}
                    >
                      {page.id === 'welcome' ? (
                        <WelcomePage />
                      ) : page.id === 'examples' ? (
                        <ExamplesPage examples={examples} />
                      ) : page.id === 'packages' ? (
                        <PackagesPage />
                      ) : (
                        <DocsMarkdown page={page} />
                      )}
                    </Article>
                  ) : (
                    <Container maxW="7xl" py={{ base: 12, md: 20 }}>
                      <Stack gap={4} align="flex-start">
                        <Heading as="h1">Page not found</Heading>
                        <Text color="fg.muted">
                          The page may have moved, or the address may be
                          incorrect.
                        </Text>
                        <SiteLink href="/">Return home</SiteLink>
                      </Stack>
                    </Container>
                  )}
                </SiteShell>
                <CommuneFooter />
              </DocumentationProvider>
            </SearchRecommendations.Provider>
          </SiteNavigationProvider>
        </Analytics>
      </PostkitProvider>
    </ThemeProvider>
  );
}

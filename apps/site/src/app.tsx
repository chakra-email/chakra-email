import {
  DocsArticle,
  DocsBreadcrumbs,
  DocsLayout,
  DocsPageActions,
  DocsPagination,
  DocsProvider,
  type DocsLinkProps,
} from '@chakra-docs/chakra';
import type { DocsPage } from '@chakra-docs/core';
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
import { useEffect, type ReactNode } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { DocsMarkdown } from './components/docs-markdown';
import { DocsMobileControls } from './components/docs-mobile-controls';
import { ExamplesPage, PackagesPage } from './components/resource-pages';
import { SiteFooter, CommuneFooter } from './components/site-footer';
import { SiteLink } from './components/site-link';
import { SiteSearch, SiteShell } from './components/site-shell';
import { WelcomePage } from './components/welcome-page';
import { WithOssPage } from './components/with-oss-page';
import { docsManifest } from './docs';
import { SiteNavigationProvider, useSiteNavigation } from './navigation';
import { docsSystem } from './theme/system';
import { getSocialImagePageRoute, toSiteHref } from './routing';
import { OgImageCard } from './components/og-image-card';
import { getOgImageContent, OG_IMAGE_DEFAULTS } from './og-image';
import { Analytics, useDocsAnalytics } from './components/analytics';

const adapter = createChakraDocsShikiAdapter({
  themes: { light: 'github-dark', dark: 'github-dark' },
});
const welcome: DocsPage = {
  id: 'welcome',
  title: 'Chakra Email',
  description:
    'Theme-aware React components and email-safe rendering. Your brand, your content, your delivery provider.',
  route: '/',
  slug: [],
  path: '',
  frontmatter: {},
  headings: [
    {
      id: 'explore-the-documentation',
      title: 'Explore the documentation',
      level: 2,
    },
    { id: 'more-resources', title: 'More resources', level: 2 },
  ],
};
const examples: DocsPage = {
  id: 'examples',
  title: 'Template examples',
  description: 'Runnable reference templates and their source code.',
  route: '/examples',
  slug: ['examples'],
  path: '',
  frontmatter: {},
  headings: [{ id: 'template-source', title: 'Template source', level: 2 }],
};
const packages: DocsPage = {
  id: 'packages',
  title: 'Packages',
  description: 'Choose the entrypoint that fits your application.',
  route: '/packages',
  slug: ['packages'],
  path: '',
  frontmatter: {},
};
const nav = [
  ...docsManifest.nav,
  { id: 'examples', title: 'Template examples', href: '/examples' },
  { id: 'packages', title: 'Packages', href: '/packages' },
];
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
}: {
  page: DocsPage;
  children: ReactNode;
  documentation?: boolean;
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
                  pageUrl={
                    new URL(toSiteHref(page.route), window.location.origin).href
                  }
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
            nav={docsManifest.nav}
            page={page}
            slotProps={{ 'aria-label': 'Documentation pagination' }}
          />
        ) : null}
      </DocsArticle>
    </DocsLayout>
  );
}

export function App() {
  const { pathname, search, navigate } = useSiteNavigation();
  const captureRoute = getSocialImagePageRoute(pathname);
  const route = captureRoute ?? pathname;
  const page =
    route === '/'
      ? welcome
      : route === '/examples'
        ? examples
        : route === '/packages'
          ? packages
          : docsManifest.byRoute[
              route === '/docs' ? '/docs/getting-started' : route
            ];
  const capture =
    captureRoute !== undefined && (page !== undefined || route === '/withoss');
  useEffect(() => {
    document.title = `${capture ? 'Open Graph image' : pathname === '/withoss' ? 'Made with OSS' : (page?.title ?? 'Page not found')} - Chakra Email`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute(
      'content',
      page?.description ?? 'Documentation and examples for Chakra Email.',
    );
    if (capture) {
      const robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'noindex, nofollow';
      document.head.append(robots);
      return () => robots.remove();
    }
    return undefined;
  }, [page, pathname, capture]);
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
        <OgImageCard
          {...getOgImageContent(new URLSearchParams(search), defaults)}
        />
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
            <DocumentationProvider>
              <SiteShell
                footer={<SiteFooter year={new Date().getFullYear()} />}
              >
                {pathname === '/withoss' ? (
                  <WithOssPage />
                ) : page ? (
                  <Article
                    page={page}
                    documentation={page.collectionId === 'docs'}
                  >
                    {page === welcome ? (
                      <WelcomePage />
                    ) : page === examples ? (
                      <ExamplesPage />
                    ) : page === packages ? (
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
          </SiteNavigationProvider>
        </Analytics>
      </PostkitProvider>
    </ThemeProvider>
  );
}

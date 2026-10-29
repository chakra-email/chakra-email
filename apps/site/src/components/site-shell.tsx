import { DocsSearch } from '@chakra-docs/chakra';
import {
  Box,
  Container,
  Flex,
  HStack,
  IconButton,
  Portal,
  Tooltip,
  useSlotRecipe,
} from '@chakra-ui/react';
import { createContext, useContext, type ReactNode } from 'react';
import { createHttpSearchProvider } from '@chakra-docs/search/client';
import { SiGithub } from 'react-icons/si';
import { useNavigate } from '../navigation';
import type { RecommendedSearchResult } from '../search-recommendations';
import { SiteLink } from './site-link';

const searchProvider = createHttpSearchProvider('/api/docs/search');
export const SearchRecommendations = createContext<RecommendedSearchResult[]>(
  [],
);

export function SiteSearch() {
  const navigate = useNavigate();
  const recommendedSearchResults = useContext(SearchRecommendations);
  return (
    <DocsSearch
      searchProvider={searchProvider}
      defaultResults={recommendedSearchResults}
      defaultResultsLabel="Recommended"
      popularLimit={6}
      onNavigate={navigate}
    />
  );
}

export function SiteShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  const styles = useSlotRecipe({ key: 'siteShell' })();
  return (
    <Box className="site-wrapper" css={styles.root}>
      <Box as="header" css={styles.header}>
        <Container css={styles.container}>
          <Flex align="center" justify="space-between" h="full" gap={2}>
            <Flex css={styles.brandGroup}>
              <SiteLink href="/" css={styles.brand}>
                chakra-email
              </SiteLink>
              <Box as="span" css={styles.version}>
                v0.3.1
              </Box>
            </Flex>
            <HStack gap={2}>
              <SiteSearch />
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton
                    asChild
                    aria-label="View chakra-email on GitHub"
                    variant="ghost"
                    css={styles.githubTrigger}
                  >
                    <SiteLink href="https://github.com/chakra-email/chakra-email">
                      <SiGithub aria-hidden="true" />
                    </SiteLink>
                  </IconButton>
                </Tooltip.Trigger>
                <Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Content>GitHub</Tooltip.Content>
                  </Tooltip.Positioner>
                </Portal>
              </Tooltip.Root>
            </HStack>
          </Flex>
        </Container>
      </Box>
      <Box as="main" id="top" className="site-content" css={styles.main}>
        {children}
      </Box>
      {footer}
    </Box>
  );
}

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
import type { ReactNode } from 'react';
import { SiGithub } from 'react-icons/si';
import { docsManifest } from '../docs';
import { useNavigate } from '../navigation';
import { getRecommendedSearchResults } from '../search-recommendations';
import { SiteLink } from './site-link';

const recommendedSearchResults = getRecommendedSearchResults(
  docsManifest.search,
);

export function SiteSearch() {
  const navigate = useNavigate();
  return (
    <DocsSearch
      records={docsManifest.search}
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
                v0.3.0
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

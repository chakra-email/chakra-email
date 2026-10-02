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
import { SiteLink } from './site-link';

export function SiteSearch() {
  const navigate = useNavigate();
  return <DocsSearch records={docsManifest.search} onNavigate={navigate} />;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const styles = useSlotRecipe({ key: 'siteShell' })();
  return (
    <Box css={styles.root}>
      <Box as="header" css={styles.header}>
        <Container css={styles.container}>
          <Flex align="center" justify="space-between" h="full" gap={2}>
            <SiteLink href="/" css={styles.brand}>
              chakra-email
            </SiteLink>
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
      <Box as="main" id="top" css={styles.main}>
        {children}
      </Box>
    </Box>
  );
}

import { DocsCards, MarkdownContent } from '@chakra-docs/chakra';
import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import { LuArrowRight } from 'react-icons/lu';
import { SiteLink } from './site-link';

const guides = [
  {
    title: 'Get started',
    description: 'Install Chakra Email and render your first template.',
    href: '/docs/getting-started',
  },
  {
    title: 'Components',
    description: 'Compose email-safe layouts, typography, and calls to action.',
    href: '/docs/components',
  },
  {
    title: 'Theming',
    description: 'Bring your brand with tokens, recipes, and color modes.',
    href: '/docs/theming',
  },
  {
    title: 'Markdown',
    description: 'Turn authored content into safe, portable email bodies.',
    href: '/docs/markdown',
  },
  {
    title: 'Rendering',
    description: 'Generate HTML and plain text for your delivery provider.',
    href: '/docs/rendering',
  },
  {
    title: 'Email preview',
    description:
      'Explore templates, variants, and compatibility checks locally.',
    href: '/docs/preview',
  },
];

export function WelcomePage() {
  return (
    <Stack gap={10}>
      <Stack align="flex-start" gap={4}>
        <Text color="fg.muted" fontSize="lg" lineHeight="tall">
          Compose transactional emails with Chakra-style props, theme tokens,
          and email-safe components. Render HTML and plain text together,
          preview locally, and send with your provider of choice.
        </Text>
        <Box w="full">
          <MarkdownContent
            source={'```bash\nnpm install chakra-email react react-dom\n```'}
          />
        </Box>
        <SiteLink
          href="/docs/getting-started"
          color="fg"
          display="inline-flex"
          alignItems="center"
          gap={1}
          fontWeight="medium"
        >
          Read the getting-started guide
          <LuArrowRight aria-hidden="true" />
        </SiteLink>
      </Stack>
      <Box>
        <Heading as="h2" id="explore-the-documentation" mb={4} size="xl">
          Explore the documentation
        </Heading>
        <DocsCards.Root>
          {guides.map((guide) => (
            <DocsCards.Card key={guide.href} {...guide} />
          ))}
        </DocsCards.Root>
      </Box>
      <Box>
        <Heading as="h2" id="more-resources" mb={3} size="lg">
          More resources
        </Heading>
        <Text color="fg.muted">
          Explore <SiteLink href="/examples">template examples</SiteLink>,
          compare <SiteLink href="/packages">package entrypoints</SiteLink>, or
          meet the <SiteLink href="/withoss">open-source projects</SiteLink>{' '}
          behind this site.
        </Text>
      </Box>
    </Stack>
  );
}

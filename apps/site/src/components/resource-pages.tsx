import { DocsCards, MarkdownContent } from '@chakra-docs/chakra';
import { Box, Heading, Stack, Tabs } from '@chakra-ui/react';
import { packageLinks } from '../site-resources';
import type { Example } from '../content';

export function ExamplesPage({ examples }: { examples: Example[] }) {
  return (
    <Stack gap={8}>
      <DocsCards.Root>
        {examples.map((example) => (
          <DocsCards.Card
            key={example.id}
            title={example.title}
            description={example.description}
            href={example.href}
          />
        ))}
      </DocsCards.Root>
      <Box>
        <Heading as="h2" id="template-source" mb={4} size="xl">
          Template source
        </Heading>
        <Tabs.Root defaultValue={examples[0]?.id} variant="line">
          <Tabs.List flexWrap="wrap" aria-label="Example source">
            {examples.map((example) => (
              <Tabs.Trigger key={example.id} value={example.id}>
                {example.title}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {examples.map((example) => (
            <Tabs.Content key={example.id} value={example.id}>
              <MarkdownContent
                source={`\`\`\`tsx\n${example.source}\n\`\`\``}
              />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </Box>
    </Stack>
  );
}

export function PackagesPage() {
  return (
    <Stack gap={8}>
      {packageLinks.map((item) => (
        <Box key={item.name}>
          <DocsCards.Card
            href={item.href}
            title={item.name}
            description={item.description}
          />
          <MarkdownContent source={`\`\`\`bash\n${item.install}\n\`\`\``} />
        </Box>
      ))}
    </Stack>
  );
}

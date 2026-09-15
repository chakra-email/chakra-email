import type { ReactNode } from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  ThemeProvider,
} from 'chakra-email';
import { patternTheme } from './theme.js';

export interface EmailShellProps {
  children: ReactNode;
  footer?: ReactNode;
  preview: string;
  productName: string;
}

export function EmailShell({
  children,
  footer = 'You received this transactional email because of activity on your account.',
  preview,
  productName,
}: EmailShellProps) {
  return (
    <ThemeProvider theme={patternTheme}>
      <Html lang="en">
        <Head />
        <Preview>{preview}</Preview>
        <Body bg="bg.subtle" color="fg" fontFamily="body" m={0}>
          <Section px={4} py={10}>
            <Container
              maxW="600px"
              bg="bg"
              border="1px solid"
              borderColor="border"
              rounded="lg"
              px={8}
              py={8}
            >
              <Text
                color="fg"
                fontSize="lg"
                fontWeight="bold"
                letterSpacing="-0.02em"
                mt={0}
                mb={8}
              >
                {productName}
              </Text>
              {children}
              <Hr borderColor="border" my={8} />
              <Text color="fg.muted" fontSize="xs" lineHeight="tall" m={0}>
                {footer}
              </Text>
            </Container>
          </Section>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

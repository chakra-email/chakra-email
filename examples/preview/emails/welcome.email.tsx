import {
  Badge,
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Table,
  TableBody,
  Text,
  ThemeProvider,
  defineTheme,
} from '@chakra-email/core';

export interface WelcomeEmailProps {
  firstName: string;
  workspaceName: string;
  planName: 'Starter' | 'Pro' | 'Business';
  trialDaysRemaining: number;
  dashboardUrl: string;
  supportEmail: string;
}

export const previewProps = {
  firstName: 'Maya',
  workspaceName: 'Northstar Studio',
  planName: 'Pro',
  trialDaysRemaining: 12,
  dashboardUrl: 'https://example.com/workspaces/northstar',
  supportEmail: 'hello@example.com',
} satisfies WelcomeEmailProps;

export const previewVariants = {
  'new-founder': {
    firstName: 'Amara',
    workspaceName: 'Orbit Works',
    planName: 'Business',
    trialDaysRemaining: 14,
    dashboardUrl: 'https://example.com/workspaces/orbit-works',
  },
  'trial-ending': {
    firstName: 'Noah',
    workspaceName: 'Field Notes',
    planName: 'Pro',
    trialDaysRemaining: 2,
    dashboardUrl: 'https://example.com/workspaces/field-notes',
  },
} satisfies Record<string, Partial<WelcomeEmailProps>>;

export const previewSubject = (props: WelcomeEmailProps) =>
  `Welcome to ${props.workspaceName}`;

const previewTheme = defineTheme({
  semanticTokens: {
    colors: {
      previewPage: { value: { _light: '#f6f7fb', _dark: '#10131d' } },
      previewSurface: { value: { _light: '#ffffff', _dark: '#1b2030' } },
      previewMutedSurface: { value: { _light: '#f6f7fb', _dark: '#242b3d' } },
      previewText: { value: { _light: '#15182a', _dark: '#f6f7fb' } },
      previewSecondary: { value: { _light: '#343a52', _dark: '#d3daeb' } },
      previewMuted: { value: { _light: '#68708a', _dark: '#aab6d0' } },
      previewBorder: { value: { _light: '#e8eaf2', _dark: '#3b455c' } },
      previewAccent: { value: { _light: '#4f46e5', _dark: '#a5b4fc' } },
    },
  },
  colors: {
    ink: {
      50: '#f6f7fb',
      100: '#e8eaf2',
      500: '#68708a',
      700: '#343a52',
      900: '#15182a',
    },
    citrus: {
      100: '#fff3c4',
      500: '#f6b91a',
      700: '#8a5c00',
    },
  },
});

export default function WelcomeEmail({
  firstName,
  workspaceName,
  planName,
  trialDaysRemaining,
  dashboardUrl,
  supportEmail,
}: WelcomeEmailProps) {
  const previewText = `${firstName}, your ${workspaceName} workspace is ready.`;

  return (
    <ThemeProvider theme={previewTheme}>
      <Html lang="en">
        <Head />
        <Preview>{previewText}</Preview>
        <Body bg="previewPage" color="previewText" fontFamily="body" m={0}>
          <Section px={4} py={10}>
            <Container
              bg="previewSurface"
              border="1px solid {colors.previewBorder}"
              rounded="2xl"
              maxW="600px"
            >
              <Section bg="ink.900" px={8} py={7}>
                <Table m={0}>
                  <TableBody>
                    <Row>
                      <Column width="68%" verticalAlign="middle">
                        <Text
                          color="white"
                          fontSize="lg"
                          fontWeight="bold"
                          letterSpacing="-0.02em"
                          m={0}
                        >
                          Northstar
                        </Text>
                      </Column>
                      <Column width="32%" align="right" verticalAlign="middle">
                        <Badge bg="citrus.100" color="citrus.700">
                          {planName} plan
                        </Badge>
                      </Column>
                    </Row>
                  </TableBody>
                </Table>
              </Section>

              <Section px={8} py={10}>
                <Text
                  color="previewAccent"
                  fontSize="xs"
                  fontWeight="bold"
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  mb={3}
                >
                  Workspace activated
                </Text>
                <Heading
                  as="h1"
                  color="previewText"
                  fontSize="3xl"
                  lineHeight="shorter"
                  letterSpacing="-0.03em"
                  mb={4}
                >
                  Welcome aboard, {firstName}.
                </Heading>
                <Text
                  color="previewSecondary"
                  fontSize="md"
                  lineHeight="tall"
                  mb={6}
                >
                  <strong>{workspaceName}</strong> is ready for your team. We
                  have set up a focused starting point so you can invite
                  collaborators, shape your workflow, and ship the first project
                  today.
                </Text>

                <Section
                  bg="previewMutedSurface"
                  border="1px solid {colors.previewBorder}"
                  rounded="lg"
                  px={5}
                  py={4}
                  mb={7}
                >
                  <Table m={0}>
                    <TableBody>
                      <Row>
                        <Column width="62%">
                          <Text color="previewMuted" fontSize="xs" mb={1}>
                            Trial status
                          </Text>
                          <Text color="previewText" fontWeight="semibold" m={0}>
                            {trialDaysRemaining} days remaining
                          </Text>
                        </Column>
                        <Column width="38%" align="right">
                          <Text color="previewMuted" fontSize="xs" mb={1}>
                            Current plan
                          </Text>
                          <Text color="previewText" fontWeight="semibold" m={0}>
                            {planName}
                          </Text>
                        </Column>
                      </Row>
                    </TableBody>
                  </Table>
                </Section>

                <Button
                  href={dashboardUrl}
                  bg="brand.600"
                  color="white"
                  size="lg"
                  align="left"
                >
                  Open {workspaceName}
                </Button>

                <Hr borderColor="previewBorder" my={8} />

                <Text
                  color="previewMuted"
                  fontSize="sm"
                  lineHeight="tall"
                  m={0}
                >
                  Need a hand getting started? Reply to this email or write to{' '}
                  <Link href={`mailto:${supportEmail}`} color="previewAccent">
                    {supportEmail}
                  </Link>
                  . A real person will help.
                </Text>
              </Section>
            </Container>

            <Text color="previewMuted" fontSize="xs" textAlign="center" mt={6}>
              Northstar, 88 Market Street, New York, NY 10013
            </Text>
          </Section>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

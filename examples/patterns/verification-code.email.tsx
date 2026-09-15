import { Heading, Section, Text } from 'chakra-email';
import { EmailShell } from './email-shell.js';

export interface VerificationCodeEmailProps {
  code: string;
  expiresInMinutes: number;
  productName: string;
}

export const previewProps = {
  code: '482 913',
  expiresInMinutes: 10,
  productName: 'Acme',
} satisfies VerificationCodeEmailProps;

export default function VerificationCodeEmail({
  code,
  expiresInMinutes,
  productName,
}: VerificationCodeEmailProps) {
  return (
    <EmailShell
      productName={productName}
      preview={`${code} is your ${productName} verification code.`}
    >
      <Heading as="h1" color="fg" fontSize="2xl" mb={3}>
        Verify your email
      </Heading>
      <Text color="fg.muted" lineHeight="tall" mt={0} mb={6}>
        Enter this code to finish signing in. It expires in {expiresInMinutes}{' '}
        minutes.
      </Text>
      <Section
        bg="accent.subtle"
        border="1px solid"
        borderColor="accent"
        rounded="md"
        px={5}
        py={5}
      >
        <Text
          color="accent.fg"
          fontFamily="mono"
          fontSize="3xl"
          fontWeight="bold"
          letterSpacing="0.16em"
          textAlign="center"
          m={0}
        >
          {code}
        </Text>
      </Section>
      <Text color="fg.muted" fontSize="sm" lineHeight="tall" mt={6} mb={0}>
        If you did not request this code, you can safely ignore this email.
      </Text>
    </EmailShell>
  );
}

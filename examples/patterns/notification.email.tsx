import { Button, Heading, Link, Text } from 'chakra-email';
import { EmailShell } from './email-shell.js';

export interface NotificationEmailProps {
  actionLabel: string;
  actionUrl: string;
  body: string;
  productName: string;
  title: string;
}

export const previewProps = {
  actionLabel: 'Review activity',
  actionUrl: 'https://example.com/activity',
  body: 'A new sign-in was detected from a device we have not seen before.',
  productName: 'Acme',
  title: 'New account activity',
} satisfies NotificationEmailProps;

export default function NotificationEmail({
  actionLabel,
  actionUrl,
  body,
  productName,
  title,
}: NotificationEmailProps) {
  return (
    <EmailShell productName={productName} preview={title}>
      <Heading as="h1" color="fg" fontSize="2xl" mb={3}>
        {title}
      </Heading>
      <Text color="fg.muted" lineHeight="tall" mt={0} mb={6}>
        {body}
      </Text>
      <Button href={actionUrl} bg="accent" color="accent.contrast" size="lg">
        {actionLabel}
      </Button>
      <Text color="fg.muted" fontSize="xs" lineHeight="tall" mt={6} mb={0}>
        Or copy this link into your browser:{' '}
        <Link href={actionUrl} color="accent.fg">
          {actionUrl}
        </Link>
      </Text>
    </EmailShell>
  );
}

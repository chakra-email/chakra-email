import { describe, expect, it } from 'vitest';
import { renderWelcomeEmail } from './basic/welcome-email';
import { renderLegacyThemeEmail } from './chakra-v2/legacy-theme-email';
import { renderMarkdownEmail } from './markdown-body/markdown-email';
import NotificationEmail, {
  previewProps as notificationProps,
} from './patterns/notification.email';
import ReceiptEmail, {
  previewProps as receiptProps,
} from './patterns/receipt.email';
import VerificationCodeEmail, {
  previewProps as verificationCodeProps,
} from './patterns/verification-code.email';
import { render, renderPlainText } from 'chakra-email';

describe('repository examples', () => {
  it('renders the basic HTML and plain-text example', async () => {
    const { html, text } = await renderWelcomeEmail();

    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('Your Acme account is ready.');
    expect(text).toContain('Welcome!');
    expect(text).toContain('Get Started [https://example.com/get-started]');
  });

  it('renders the Chakra v2 theme example', async () => {
    const html = await renderLegacyThemeEmail();

    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('Rendered with a Chakra UI v2-style theme.');
    expect(html).toContain('background-color:#6366f1');
  });

  it('renders the markdown-body example', async () => {
    const html = await renderMarkdownEmail(
      '# Release notes\n\nRead the [documentation](docs).\n\n![Logo](images/logo.png)',
    );

    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('Release notes');
    expect(html).toContain('href="https://example.com/content/docs"');
    expect(html).toContain('src="https://example.com/content/images/logo.png"');
  });

  it('renders the copyable transactional patterns', async () => {
    const [
      verificationHtml,
      verificationText,
      receiptHtml,
      receiptText,
      notificationHtml,
      notificationText,
    ] = await Promise.all([
      render(<VerificationCodeEmail {...verificationCodeProps} />),
      renderPlainText(<VerificationCodeEmail {...verificationCodeProps} />),
      render(<ReceiptEmail {...receiptProps} />),
      renderPlainText(<ReceiptEmail {...receiptProps} />),
      render(<NotificationEmail {...notificationProps} />),
      renderPlainText(<NotificationEmail {...notificationProps} />),
    ]);

    expect(verificationHtml).toContain('482 913');
    expect(verificationHtml).toContain('background-color:#e0e7ff');
    expect(verificationText).toContain('Verify your email');
    expect(receiptHtml).toContain('Order A-1042');
    expect(receiptText).toContain('$30.00');
    expect(notificationHtml).toContain('Review activity');
    expect(notificationHtml).toContain('background-color:#6366f1');
    expect(notificationText).toContain(
      'Review activity [https://example.com/activity]',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { renderWelcomeEmail } from './basic/welcome-email';
import { renderLegacyThemeEmail } from './chakra-v2/legacy-theme-email';
import { renderMarkdownEmail } from './markdown-body/markdown-email';

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
});

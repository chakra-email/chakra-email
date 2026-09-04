import { describe, expect, it } from 'vitest';
import { Button, Img, Link } from '../components/index.js';
import { render, renderEmail, renderPlainText } from '../render/index.js';
import {
  EmailRenderError,
  EmailSecurityPolicyProvider,
  isEmailRenderError,
  sanitizeEmailUrl,
} from './index.js';

describe('email URL policy', () => {
  it('applies strict defaults to every URL-bearing component', async () => {
    const html = await render(
      <>
        <Link href="https://user:secret@example.com/link">Link</Link>
        <Button href="mailto:hello@example.com?subject=x%0d%0aBcc:y@example.com">
          Button
        </Button>
        <Img src="https://user:secret@example.com/image.png" alt="Image" />
      </>,
    );

    expect(html).not.toContain('user:secret');
    expect(html).not.toContain('%0d%0a');
    expect(html).not.toMatch(/\s(?:href|src)=/u);
  });

  it('supports provider and per-render overrides', async () => {
    const providerHtml = await render(
      <EmailSecurityPolicyProvider
        policy={{ link: { allowedProtocols: ['https', 'ftp'] } }}
      >
        <Link href="ftp://example.com/file">Download</Link>
      </EmailSecurityPolicyProvider>,
    );
    const rendered = await renderEmail(
      <Link href="https://user:secret@example.com/link">Account</Link>,
      { urlPolicy: { link: { allowCredentials: true } } },
    );
    const text = await renderPlainText(
      <Link href="ftp://example.com/file">Download</Link>,
      { urlPolicy: { link: { allowedProtocols: ['ftp'] } } },
    );

    expect(providerHtml).toContain('href="ftp://example.com/file"');
    expect(rendered.html).toContain(
      'href="https://user:secret@example.com/link"',
    );
    expect(text).toContain('ftp://example.com/file');
  });

  it('can fail closed without exposing rejected content', async () => {
    const unsafeUrl = 'https://user:secret@example.com/private';
    let thrown: unknown;

    try {
      await render(<Link href={unsafeUrl}>Private</Link>, {
        urlPolicy: { link: { onInvalidUrl: 'throw' } },
      });
    } catch (error) {
      thrown = error;
    }

    expect(isEmailRenderError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: 'UNSAFE_URL',
      details: { kind: 'link', reason: 'credentials' },
    });
    expect((thrown as Error).message).not.toContain(unsafeUrl);
  });

  it('uses typed errors for invalid policy configuration', () => {
    expect(() =>
      sanitizeEmailUrl('https://example.com', {
        kind: 'link',
        policy: { maxBytes: 0 },
      }),
    ).toThrowError(EmailRenderError);

    try {
      sanitizeEmailUrl('https://example.com', {
        kind: 'link',
        policy: { allowedProtocols: ['not a protocol'] },
      });
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_COMPONENT_PROP' });
    }
  });
});

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
  it.each([
    'https://example.com/?q=100%25',
    'https://example.com/%25hello',
    'https://example.com/?q=%25ZZ',
    'https://example.com/?q=%E2%9C%93%20%25',
    'mailto:hello@example.com?subject=100%25%20complete',
  ])('preserves valid percent-encoded content unchanged: %s', (value) => {
    expect(
      sanitizeEmailUrl(value, {
        kind: 'link',
        policy: { onInvalidUrl: 'throw' },
      }),
    ).toBe(value);
  });

  it.each([
    'https://example.com/%ZZ',
    'https://example.com/%E2%28%A1',
    'mailto:hello@example.com?subject=100%25%0d%0aBcc:x',
    'tel:+15555550123%250aextension',
    'https://example.com/%25%2530%2561',
    'https://example.com/%252500',
    `https://example.com/%${'25'.repeat(12)}0a`,
  ])(
    'continues rejecting malformed encodings and nested controls: %s',
    (value) => {
      expect(sanitizeEmailUrl(value, { kind: 'link' })).toBeUndefined();
      expect(() =>
        sanitizeEmailUrl(value, {
          kind: 'link',
          policy: { onInvalidUrl: 'throw' },
        }),
      ).toThrowError(EmailRenderError);
    },
  );

  it('preserves percent-encoded links and images in rendered output', async () => {
    const { html, text } = await renderEmail(
      <>
        <Link href="https://example.com/?q=100%25">Offer</Link>
        <Img src="https://example.com/%25logo.png" alt="Logo" />
      </>,
    );
    expect(html).toContain('href="https://example.com/?q=100%25"');
    expect(html).toContain('src="https://example.com/%25logo.png"');
    expect(text).toContain('https://example.com/?q=100%25');
  });

  it.each([render, renderEmail, renderPlainText])(
    'rejects unsupported image candidate lists across rendering entry points',
    async (renderImage) => {
      const srcSet = 'http://user:secret@example.com/image.png 2x';
      const image = (
        // @ts-expect-error srcSet is intentionally unsupported, including for typed consumers.
        <Img src="https://example.com/image.png" alt="Image" srcSet={srcSet} />
      );
      await expect(renderImage(image)).rejects.toMatchObject({
        code: 'INVALID_COMPONENT_PROP',
        details: { component: 'Img', prop: 'srcSet' },
        message: 'Img does not support srcSet. Use a single src instead.',
      });
      await expect(
        renderImage(image, {
          urlPolicy: {
            image: { allowedProtocols: ['https'], onInvalidUrl: 'throw' },
          },
        }),
      ).rejects.toMatchObject({ code: 'INVALID_COMPONENT_PROP' });
    },
  );

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

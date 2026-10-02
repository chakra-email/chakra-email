import { describe, expect, it } from 'vitest';
import { getSitePathname, toSiteHref } from './routing';

describe('site deployment base', () => {
  it('prefixes application links and artwork but leaves external URLs and fragments alone', () => {
    expect(toSiteHref('/docs/theming', '/chakra-email/')).toBe(
      '/chakra-email/docs/theming',
    );
    expect(toSiteHref('/assets/oss.svg', '/chakra-email/')).toBe(
      '/chakra-email/assets/oss.svg',
    );
    expect(toSiteHref('/', '/chakra-email/')).toBe('/chakra-email/');
    for (const href of [
      'https://example.com',
      '//example.com',
      '#install',
      'mailto:hi@example.com',
    ])
      expect(toSiteHref(href, '/chakra-email/')).toBe(href);
    expect(toSiteHref('/docs/theming', '/')).toBe('/docs/theming');
  });
  it('normalizes browser paths without treating similar prefixes as application routes', () => {
    expect(
      getSitePathname('/chakra-email/docs/theming', '/chakra-email/'),
    ).toBe('/docs/theming');
    expect(getSitePathname('/chakra-email/', '/chakra-email/')).toBe('/');
    expect(getSitePathname('/chakra-email', '/chakra-email/')).toBe('/');
    expect(getSitePathname('/chakra-email-other', '/chakra-email/')).toBe(
      '/chakra-email-other',
    );
    expect(getSitePathname('/docs/theming', '/')).toBe('/docs/theming');
  });
});

import { describe, expect, it } from 'vitest';
import { getOgImageContent, OG_IMAGE_DEFAULTS } from './og-image';

describe('Open Graph capture copy', () => {
  it('uses defaults, normalizes whitespace, and bounds Unicode copy', () => {
    expect(getOgImageContent(new URLSearchParams())).toEqual(OG_IMAGE_DEFAULTS);
    expect(
      getOgImageContent(
        new URLSearchParams({
          title: '  Email\n for everyone ',
          description: ' ',
        }),
      ),
    ).toEqual({
      title: 'Email for everyone',
      description: OG_IMAGE_DEFAULTS.description,
    });
    const long = getOgImageContent(
      new URLSearchParams({
        title: '😀'.repeat(101),
        description: 'x'.repeat(201),
      }),
    );
    expect(Array.from(long.title)).toHaveLength(100);
    expect(long.description).toHaveLength(200);
    expect(
      getOgImageContent(
        new URLSearchParams({ title: '<script>bad()</script>' }),
      ).title,
    ).toBe('<script>bad()</script>');
  });
});

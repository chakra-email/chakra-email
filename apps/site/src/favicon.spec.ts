import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('application favicons', () => {
  it('uses blank icons instead of Nx starter branding in the site and preview', () => {
    for (const app of ['site', 'preview-ui']) {
      const html = readFileSync(
        new URL(
          app === 'site' ? './app/layout.tsx' : '../../preview-ui/index.html',
          import.meta.url,
        ),
        'utf8',
      );
      expect(html).toMatch(/(?:icon:|rel="icon")[\s\S]*data:image\/svg\+xml/);
      expect(html).not.toContain('/favicon.ico');
    }
    expect(existsSync(new URL('../public/favicon.ico', import.meta.url))).toBe(
      false,
    );
  });
});

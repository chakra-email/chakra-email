// @vitest-environment jsdom
import axe from 'axe-core';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { docPages, examples, packageLinks } from './content';
import { OG_IMAGE_DEFAULTS } from './og-image';
import { siteOgImageRecipe } from './theme/og-image';
import { siteSlotRecipes } from './theme/site-recipes';
import { siteThemeConfig } from './theme/system';

let root: Root;
beforeEach(async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(vi.fn());
  window.history.replaceState({}, '', '/');
  document.documentElement.lang = 'en';
  document.title = 'Chakra Email';
  document.body.innerHTML = '<div id="app"></div>';
  const appElement = document.getElementById('app');
  if (!appElement) throw new Error('Missing test app root.');
  root = createRoot(appElement);
  await act(async () => root.render(createElement(App)));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function navigate(path: string) {
  await act(async () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

describe('documentation application', () => {
  it('shares one mobile toolbar across home, docs, examples, and packages', async () => {
    for (const path of [
      '/',
      '/docs/getting-started',
      '/examples',
      '/packages',
    ]) {
      await navigate(path);
      const controls = document.querySelector(
        '[aria-label="Documentation controls"]',
      );
      expect(controls).not.toBeNull();
      expect(
        controls?.querySelectorAll('button[aria-label="Open navigation"]'),
      ).toHaveLength(1);
      expect(controls?.querySelectorAll('summary')).toHaveLength(
        path === '/packages' ? 0 : 1,
      );
      if (path !== '/packages') {
        const indicator = controls?.querySelector('summary svg');
        expect(indicator?.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(indicator?.getAttribute('width')).toBe('16');
        expect(indicator?.querySelector('path')?.getAttribute('d')).toBe(
          'm6 9 6 6 6-6',
        );
      }
      expect(
        document.querySelectorAll('button[aria-label="Open navigation"]'),
      ).toHaveLength(1);
    }
  });

  it('uses a full-viewport mobile drawer with safe-area spacing and compact controls', () => {
    expect(siteSlotRecipes.siteDocsMobileControls.base?.root).toMatchObject({
      display: { base: 'flex', xl: 'none' },
      alignItems: 'flex-start',
    });
    expect(siteSlotRecipes.siteDocsMobileControls.base?.toc).toMatchObject({
      flex: '1',
      minW: 0,
      mb: 0,
      pb: 0,
      borderBottomWidth: 0,
    });
    expect(
      siteThemeConfig.theme?.slotRecipes?.chakraDocsLayout.base?.root,
    ).toMatchObject({
      pt: { base: 4, lg: 8 },
    });
    const navigation =
      siteThemeConfig.theme?.slotRecipes?.chakraDocsMobileNavigation.base;
    expect(navigation?.positioner).toMatchObject({
      position: 'fixed',
      inset: 0,
      w: '100dvw',
      h: '100dvh',
      p: 0,
    });
    expect(navigation?.content).toMatchObject({
      w: '100dvw',
      h: '100dvh',
      maxH: '100dvh',
      maxW: 'none',
      m: 0,
    });
    expect(navigation?.header).toMatchObject({
      pt: 'env(safe-area-inset-top)',
    });
    expect(navigation?.body).toMatchObject({
      pb: 'max(1rem, env(safe-area-inset-bottom))',
    });
  });

  it('opens and closes the accessible mobile navigation on home and docs', async () => {
    for (const path of [
      '/',
      '/docs/getting-started',
      '/examples',
      '/packages',
    ]) {
      await navigate(path);
      const trigger = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Open navigation"]',
      );
      expect(trigger).not.toBeNull();
      await act(async () => trigger?.click());
      const dialog = document.querySelector(
        '[role="dialog"][data-state="open"]',
      );
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Browse documentation');
      expect(
        dialog?.querySelector('button[aria-haspopup="dialog"]')?.textContent,
      ).toContain('Search');
      const close = dialog?.querySelector<HTMLButtonElement>(
        'button[aria-label="Close navigation"]',
      );
      expect(close).not.toBeNull();
      await act(async () => close?.click());
      expect(
        document.querySelector('[role="dialog"][data-state="open"]'),
      ).toBeNull();
    }
  });

  it('renders fixed OG capture pages without site chrome and cleans up noindex metadata', async () => {
    for (const path of ['/og-image', '/og-image/']) {
      await navigate(path);
      expect(document.querySelector('h1')?.textContent).toBe(
        OG_IMAGE_DEFAULTS.title,
      );
      expect(document.querySelector('main')?.getAttribute('aria-label')).toBe(
        'Open Graph image',
      );
      expect(siteOgImageRecipe.base?.root.w).toBe('1200px');
      expect(siteOgImageRecipe.base?.root.h).toBe('630px');
      expect(document.querySelector('header, footer, button')).toBeNull();
      expect(
        document.querySelector('meta[name="robots"]')?.getAttribute('content'),
      ).toBe('noindex, nofollow');
      expect(document.querySelector('[data-og-ready="true"]')).not.toBeNull();
    }
    await navigate(
      '/og-image?title=%3Cscript%3Ebad()%3C%2Fscript%3E&description=Custom',
    );
    expect(document.querySelector('h1')?.textContent).toBe(
      '<script>bad()</script>',
    );
    expect(document.querySelector('main script')).toBeNull();
    expect(document.querySelector('main')?.textContent).toContain('Custom');
    await navigate('/');
    expect(document.querySelector('header')).not.toBeNull();
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
  it('populates social-image captures from the matching page and preserves query overrides', async () => {
    for (const path of [
      '/docs/getting-started/social-image',
      '/og-image/docs/getting-started',
    ]) {
      await navigate(path);
      expect(document.querySelector('h1')?.textContent).toBe('Getting Started');
      expect(document.querySelector('main')?.textContent).toContain(
        docPages[0]?.description,
      );
      expect(document.querySelector('header, footer')).toBeNull();
    }
    await navigate('/docs/getting-started/social-image?title=Override');
    expect(document.querySelector('h1')?.textContent).toBe('Override');
    await navigate('/social-image');
    expect(document.querySelector('h1')?.textContent).toBe(
      OG_IMAGE_DEFAULTS.title,
    );
    await navigate('/missing/social-image');
    expect(document.querySelector('h1')?.textContent).toBe('Page not found');
  });
  it('renders a docs-first welcome page, shared header, and 2026 footers', () => {
    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')?.textContent).toBe('Chakra Email');
    expect(document.querySelector('header')?.textContent).toContain(
      'chakra-email',
    );
    expect(
      document.querySelector(
        'header a[aria-label="View chakra-email on GitHub"]',
      ),
    ).not.toBeNull();
    expect(document.querySelector('footer')?.textContent).toContain('© 2026');
    expect(document.querySelector('footer a[href="/withoss"]')).not.toBeNull();
    expect(
      document
        .querySelector('[aria-label="By Commune Software"] a')
        ?.getAttribute('href'),
    ).toBe('https://commune.software');

    const wrapper = document.querySelector<HTMLElement>('.site-wrapper');
    const content = document.querySelector<HTMLElement>('.site-content');
    const footer = document.querySelector<HTMLElement>('footer');
    const commune = document.querySelector<HTMLElement>(
      '[aria-label="By Commune Software"]',
    );

    expect(wrapper).not.toBeNull();
    expect(content).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(commune).not.toBeNull();
    expect(wrapper?.contains(content)).toBe(true);
    expect(wrapper?.contains(footer)).toBe(true);
    expect(wrapper?.contains(commune)).toBe(false);
    expect(wrapper?.nextElementSibling).toBe(commune);
    expect(siteSlotRecipes.siteShell.base?.root).toMatchObject({
      display: 'flex',
      flexDirection: 'column',
      minH: '100dvh',
    });
    expect(siteSlotRecipes.siteShell.base?.main).toMatchObject({ flexGrow: 1 });
  });
  it('navigates from the welcome page into a single Postkit article without duplicate titles', async () => {
    const link = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a'),
    ).find((item) => item.textContent === 'Read the getting-started guide');
    await act(async () => link?.click());
    expect(window.location.pathname).toBe('/docs/getting-started');
    expect(document.querySelector('main article h1')?.textContent).toBe(
      docPages[0]?.title,
    );
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('[data-postkit-prose]')).not.toBeNull();
    expect(document.querySelector('h2#install')).not.toBeNull();
    const componentsLink = document.querySelector<HTMLAnchorElement>(
      'nav a[href="/docs/components"]',
    );
    await act(async () => componentsLink?.click());
    expect(window.location.pathname).toBe('/docs/components');
    expect(document.querySelector('h1')?.textContent).toBe('Components');
    expect(document.querySelector('h2#document')).not.toBeNull();
    const ids = Array.from(document.querySelectorAll('[id]')).map(
      (element) => element.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('preserves modified link clicks and responds to browser history', async () => {
    await navigate('/docs/markdown#url-portability');
    expect(document.querySelector('h1')?.textContent).toBe('Markdown');
    const link = document.querySelector<HTMLAnchorElement>(
      'nav a[href="/docs/getting-started"]',
    );
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    link?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(window.location.pathname).toBe('/docs/markdown');
  });
  it('uses Chakra tabs and highlighted code blocks for template examples', async () => {
    await navigate('/examples');
    const tabs = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    expect(tabs).toHaveLength(examples.length);
    expect(document.querySelector('[role="tabpanel"]')?.textContent).toContain(
      examples[0]?.source.trim(),
    );
    await act(async () => tabs[1]?.click());
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(
      document.querySelector('[role="tabpanel"]:not([hidden])')?.textContent,
    ).toContain(examples[1]?.source.trim());
  });
  it('shows all package entrypoints, OSS acknowledgements, and a useful not-found page', async () => {
    await navigate('/packages');
    for (const item of packageLinks)
      expect(
        document.querySelector(`main a[href="${item.href}"]`),
      ).not.toBeNull();
    await navigate('/withoss');
    for (const [id, title] of [
      ['library', 'Library and packages'],
      ['site', 'Documentation site'],
    ]) {
      const section = document.querySelector(
        `section[aria-labelledby="oss-${id}"]`,
      );
      expect(section?.querySelector('h2')?.textContent).toBe(title);
      expect(section?.querySelectorAll('li').length).toBeGreaterThan(0);
    }
    expect(document.querySelector('h1')?.getAttribute('aria-label')).toBe(
      'Made with open-source software',
    );
    expect(
      document.querySelector('main img[src="/assets/oss.svg"]'),
    ).not.toBeNull();
    await navigate('/not-a-page');
    expect(document.querySelector('h1')?.textContent).toBe('Page not found');
    expect(document.querySelector('main a[href="/"]')?.textContent).toBe(
      'Return home',
    );
  });
  it('has no automated accessibility violations on welcome and docs pages', async () => {
    for (const path of ['/', '/docs/getting-started', '/withoss']) {
      await navigate(path);
      const result = await axe.run(document, {
        resultTypes: ['violations'],
        rules: {
          'color-contrast': { enabled: false },
          'aria-allowed-attr': { enabled: false },
        },
      });
      expect(result.violations).toEqual([]);
    }
  }, 60_000);
});

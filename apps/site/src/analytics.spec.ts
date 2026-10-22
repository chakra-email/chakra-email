// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { FathomClient } from 'react-fathom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Analytics } from './components/analytics';

let root: Root;
let element: HTMLDivElement;
let client: FathomClient;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubEnv('VITE_FATHOM_SITE_ID', 'TESTSITE');
  vi.stubEnv('VITE_FATHOM_CUSTOM_DOMAIN', 'analytics.example.com');
  window.history.replaceState({}, '', '/docs?token=private#heading');
  element = document.createElement('div');
  document.body.append(element);
  root = createRoot(element);
  client = {
    load: vi.fn(),
    setSite: vi.fn(),
    trackPageview: vi.fn(),
    trackEvent: vi.fn(),
    trackGoal: vi.fn(),
    blockTrackingForMe: vi.fn(),
    enableTrackingForMe: vi.fn(),
    isTrackingEnabled: () => false,
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  element.remove();
  vi.unstubAllEnvs();
});
async function render(pathname: string) {
  await act(async () =>
    root.render(
      createElement(
        StrictMode,
        {},
        createElement(Analytics, {
          pathname,
          client,
          children: 'Page content',
        }),
      ),
    ),
  );
}
describe('site analytics', () => {
  it('uses React Fathom for one initial pageview, navigation, and return visits', async () => {
    await render('/docs');
    expect(client.load).toHaveBeenCalledWith('TESTSITE', {
      auto: false,
      canonical: false,
      honorDNT: true,
      url: 'https://analytics.example.com/script.js',
    });
    expect(client.trackPageview).toHaveBeenCalledTimes(1);
    expect(client.trackPageview).toHaveBeenLastCalledWith({
      url: `${window.location.origin}/docs`,
    });
    const loads = vi.mocked(client.load).mock.calls.length;
    await render('/docs');
    expect(client.trackPageview).toHaveBeenCalledTimes(1);
    await render('/docs/setup');
    await render('/docs');
    expect(client.trackPageview).toHaveBeenCalledTimes(3);
    expect(client.load).toHaveBeenCalledTimes(loads);
    expect(
      JSON.stringify(vi.mocked(client.trackPageview).mock.calls),
    ).not.toMatch(/private|token|heading/);
  });
  it('preserves children without loading analytics when no ID is set', async () => {
    vi.stubEnv('VITE_FATHOM_SITE_ID', '');
    await render('/docs');
    expect(element.textContent).toBe('Page content');
    expect(client.load).not.toHaveBeenCalled();
    expect(client.trackPageview).not.toHaveBeenCalled();
  });
  it('never loads an analytics client for social-image captures', async () => {
    for (const route of ['/og-image', '/docs/setup/social-image/'])
      await render(route);
    expect(client.load).not.toHaveBeenCalled();
    expect(client.trackPageview).not.toHaveBeenCalled();
  });
});

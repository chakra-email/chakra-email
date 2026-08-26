// @vitest-environment jsdom

import axe from 'axe-core';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { App } from './app';
import { docPages, examples } from './content';

let root: Root;

beforeAll(async () => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  document.documentElement.lang = 'en';
  document.title = 'Chakra Email';
  document.body.innerHTML = '<div id="app"></div>';
  const appElement = document.querySelector('#app');
  if (!appElement) {
    throw new Error('Missing test app root.');
  }
  root = createRoot(appElement);
  await act(async () => {
    root.render(createElement(App));
  });
});

afterAll(async () => {
  await act(async () => root.unmount());
});

describe('documentation application', () => {
  it('renders Chakra Docs navigation and one active Postkit article', () => {
    const articles = Array.from(
      document.querySelectorAll<HTMLElement>('#docs article'),
    );
    const ids = Array.from(document.querySelectorAll<HTMLElement>('[id]')).map(
      (element) => element.id,
    );

    expect(articles).toHaveLength(1);
    const docsNavigation = Array.from(
      document.querySelectorAll<HTMLElement>('#docs nav'),
    ).find(
      (navigation) =>
        navigation.querySelectorAll('a[href^="/docs/"]').length ===
        docPages.length,
    );
    expect(docsNavigation).toBeDefined();
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(articles[0]?.querySelector('h2')?.textContent).toBe(
      docPages[0]?.title,
    );
    expect(articles[0]?.querySelector('[data-postkit-prose]')).not.toBeNull();
    expect(articles[0]?.querySelector('h3#install')).not.toBeNull();
  });

  it('navigates between manifest pages without a full document load', async () => {
    const componentsLink = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('#docs nav a'),
    ).find((link) => link.getAttribute('href') === '/docs/components');

    await act(async () => {
      componentsLink?.click();
    });

    expect(window.location.pathname).toBe('/docs/components');
    expect(document.querySelector('#docs article h2')?.textContent).toBe(
      'Components',
    );
    expect(document.querySelector('h3#document')).not.toBeNull();
  });

  it('updates the example panel with pointer and keyboard navigation', async () => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const panel = document.querySelector<HTMLElement>('[role="tabpanel"]');
    const code = document.querySelector<HTMLElement>('#example-code');

    expect(tabs).toHaveLength(examples.length);
    expect(panel).not.toBeNull();
    expect(code?.textContent).toBe(examples[0]?.source);

    await act(async () => tabs[1]?.click());
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(code?.textContent).toBe(examples[1]?.source);

    await act(async () => {
      tabs[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
      );
    });
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[2]);
    expect(panel?.getAttribute('aria-labelledby')).toBe(tabs[2]?.id);
    expect(code?.textContent).toBe(examples[2]?.source);

    await act(async () => {
      tabs[2]?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }),
      );
    });
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[0]);

    await act(async () => {
      tabs[0]?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'End' }),
      );
    });
    expect(tabs.at(-1)?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs.at(-1));
    expect(code?.textContent).toBe(examples.at(-1)?.source);

    await act(async () => {
      tabs
        .at(-1)
        ?.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }),
        );
    });
    expect(tabs.at(-2)?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs.at(-2));
    expect(code?.textContent).toBe(examples.at(-2)?.source);

    const ignoredKey = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    tabs.at(-2)?.dispatchEvent(ignoredKey);
    expect(ignoredKey.defaultPrevented).toBe(false);
    expect(tabs.at(-2)?.getAttribute('aria-selected')).toBe('true');
  });

  it('has no automated accessibility violations', async () => {
    const result = await axe.run(document, {
      resultTypes: ['violations'],
      rules: {
        'color-contrast': { enabled: false },
        // Chakra CodeBlock currently applies aria-expanded to its content div.
        'aria-allowed-attr': { enabled: false },
      },
    });

    expect(result.violations).toEqual([]);
  }, 60_000);
});

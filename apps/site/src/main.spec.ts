// @vitest-environment jsdom

import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { docPages, examples } from './content';

beforeAll(async () => {
  document.documentElement.lang = 'en';
  document.title = 'Chakra Email';
  document.body.innerHTML = '<div id="app"></div>';

  await import('./main');
});

describe('documentation application', () => {
  it('renders every configured page with unique ids and a valid article outline', () => {
    const articles = Array.from(
      document.querySelectorAll<HTMLElement>('.doc-panel'),
    );
    const ids = Array.from(document.querySelectorAll<HTMLElement>('[id]')).map(
      (element) => element.id,
    );

    expect(articles).toHaveLength(docPages.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.querySelectorAll('h1')).toHaveLength(1);

    for (const article of articles) {
      const headings = Array.from(
        article.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6'),
      );

      expect(headings[0]?.tagName).toBe('H2');
      expect(
        headings.slice(1).every((heading) => heading.tagName !== 'H1'),
      ).toBe(true);
      expect(
        headings.slice(1).every((heading) => heading.tagName !== 'H2'),
      ).toBe(true);
    }
  });

  it('updates the example panel with pointer and keyboard navigation', () => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const panel = document.querySelector<HTMLElement>('[role="tabpanel"]');
    const code = document.querySelector<HTMLElement>('#example-code');

    expect(tabs).toHaveLength(examples.length);
    expect(panel).not.toBeNull();
    expect(code?.textContent).toBe(examples[0]?.source);

    tabs[1]?.click();
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(code?.textContent).toBe(examples[1]?.source);

    tabs[1]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    );
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[2]);
    expect(panel?.getAttribute('aria-labelledby')).toBe(tabs[2]?.id);
    expect(code?.textContent).toBe(examples[2]?.source);

    tabs[2]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }),
    );
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[0]);

    tabs[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'End' }),
    );
    expect(tabs.at(-1)?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs.at(-1));
    expect(code?.textContent).toBe(examples.at(-1)?.source);

    tabs
      .at(-1)
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }),
      );
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
      },
    });

    expect(result.violations).toEqual([]);
  }, 60_000);
});

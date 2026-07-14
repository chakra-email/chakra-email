import { describe, expect, it } from 'vitest';
import type { Example } from './content';
import { exampleTabId, nextExampleTabIndex, renderExampleTabs } from './tabs';

const examples: Example[] = [
  {
    id: 'basic',
    title: 'Basic',
    description: 'Basic example',
    href: '#basic',
    source: 'basic source',
  },
  {
    id: 'markdown-body',
    title: 'Markdown',
    description: 'Markdown example',
    href: '#markdown',
    source: 'markdown source',
  },
];

describe('example tabs', () => {
  it('renders a complete accessible tab relationship', () => {
    const html = renderExampleTabs(examples, 'basic');

    expect(html).toContain('id="example-tab-basic"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-controls="example-panel"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-selected="false"');
    expect(html).toContain('tabindex="-1"');
  });

  it('normalizes ids before using them in ARIA references', () => {
    expect(exampleTabId('unsafe id/value')).toBe('example-tab-unsafe-id-value');
  });

  it('implements wrapping arrow and boundary-key tab navigation', () => {
    expect(nextExampleTabIndex('ArrowRight', 2, 3)).toBe(0);
    expect(nextExampleTabIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(nextExampleTabIndex('Home', 2, 3)).toBe(0);
    expect(nextExampleTabIndex('End', 0, 3)).toBe(2);
  });

  it('ignores unrelated keys and empty tab sets', () => {
    expect(nextExampleTabIndex('Enter', 0, 3)).toBeUndefined();
    expect(nextExampleTabIndex('ArrowRight', 0, 0)).toBeUndefined();
  });
});

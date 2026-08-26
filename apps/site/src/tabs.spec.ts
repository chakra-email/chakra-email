import { describe, expect, it } from 'vitest';
import { exampleTabId, nextExampleTabIndex } from './tabs';

describe('example tabs', () => {
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

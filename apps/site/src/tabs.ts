import type { Example } from './content';
import { escapeHtml } from './markdown';

export function exampleTabId(exampleId: string): string {
  return `example-tab-${exampleId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function nextExampleTabIndex(
  key: string,
  currentIndex: number,
  tabCount: number,
): number | undefined {
  if (tabCount <= 0) {
    return undefined;
  }

  if (key === 'ArrowRight') {
    return (currentIndex + 1) % tabCount;
  }
  if (key === 'ArrowLeft') {
    return (currentIndex - 1 + tabCount) % tabCount;
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return tabCount - 1;
  }

  return undefined;
}

export function renderExampleTabs(
  examples: readonly Example[],
  selectedExampleId: string,
): string {
  return examples
    .map((example) => {
      const selected = example.id === selectedExampleId;
      return `
        <button
          id="${exampleTabId(example.id)}"
          class="example-tab${selected ? ' is-active' : ''}"
          type="button"
          role="tab"
          aria-selected="${selected}"
          aria-controls="example-panel"
          tabindex="${selected ? '0' : '-1'}"
          data-example-id="${escapeHtml(example.id)}"
        >
          ${escapeHtml(example.title)}
        </button>
      `;
    })
    .join('');
}

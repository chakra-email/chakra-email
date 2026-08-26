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

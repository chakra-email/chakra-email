if (typeof globalThis.CSS === 'undefined') {
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: {},
  });
}

if (typeof globalThis.CSS.escape !== 'function') {
  globalThis.CSS.escape = (value) =>
    String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock implements ResizeObserver {
    disconnect = (): void => undefined;

    observe = (): void => undefined;

    unobserve = (): void => undefined;
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: ResizeObserverMock,
  });
}

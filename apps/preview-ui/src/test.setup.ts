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
// JSDOM batches frame callbacks without the browser's microtask checkpoint
// between them. Chakra Tabs queues a focus update in a microtask before its
// next frame callback selects that tab. Give each callback its own task so
// tests exercise the same focus -> selection ordering as the browser.
globalThis.requestAnimationFrame = (callback) =>
  window.setTimeout(() => callback(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id);

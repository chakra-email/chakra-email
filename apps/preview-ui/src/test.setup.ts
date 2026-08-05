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

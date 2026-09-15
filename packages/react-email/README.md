# @chakra-email/react-email

Optional React Email renderer integration for Chakra Email tooling.

## Install

```bash
npm install @chakra-email/react-email react-email react react-dom
```

## Preview React Email templates

```ts
import { reactEmailRenderer } from '@chakra-email/react-email';
import { defineConfig } from '@chakra-email/preview';

export default defineConfig({
  renderer: reactEmailRenderer(),
});
```

The adapter can render templates composed from React Email components, Chakra
Email components, or both. React Email remains an optional peer dependency and
is not installed by `@chakra-email/core` or `@chakra-email/preview`.

Renderer-wide Chakra Email `urlPolicy`, `outputLimits`, and `colorMode` options are forwarded
by the adapter. React 19's browser-oriented image preload hints are removed
before adapter output is returned.

Chakra Email components retain their semantic light/dark colors through this
adapter: system mode collects dark CSS alongside light inline styles in one
React render. React Email components retain their own authored styles; they are
not automatically converted to Chakra Email tokens or dark-mode rules.

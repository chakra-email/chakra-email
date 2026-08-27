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

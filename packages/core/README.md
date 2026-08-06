# @chakra-email/core

[![npm](https://img.shields.io/npm/v/%40chakra-email%2Fcore?style=flat-square)](https://www.pkgstats.com/pkg:@chakra-email/core)
[![NPM](https://img.shields.io/npm/l/%40chakra-email%2Fcore?style=flat-square)](https://github.com/chakra-email/chakra-email/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/dt/%40chakra-email%2Fcore?style=flat-square)](https://www.pkgstats.com/pkg:@chakra-email/core)

Shared implementation for Chakra Email packages.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Most applications should install `chakra-email` for current Chakra UI v3-style themes or `@chakra-email/chakra-v2` for legacy Chakra UI v2 themes. Install `@chakra-email/core` directly when you are building an adapter package or integrating the renderer into custom tooling.

## Install

```bash
npm install @chakra-email/core react react-dom
```

> [!NOTE]
> `@chakra-email/core` is ESM-only and requires Node.js 20.19 or newer. Node.js 22 or 24 is recommended for new deployments.

## Includes

- React email primitives.
- Markdown-body primitives for blockquotes, code, preformatted blocks, and tables.
- Email-safe Chakra-style style prop mapping.
- Chakra v3 token object and semantic token resolution.
- Chakra v2-style flat theme scale compatibility.
- HTML and plain-text render helpers.

## Exports

```ts
import {
  Blockquote,
  Button,
  Code,
  Table,
  Text,
} from '@chakra-email/core/components';
import { render, renderPlainText } from '@chakra-email/core/render';
import { ThemeProvider } from '@chakra-email/core/theme';
```

## Package Role

`@chakra-email/core` is intentionally lower-level than `chakra-email`. Its public surface is stable for adapter authors, but application code should usually import from `chakra-email` or `@chakra-email/chakra-v2`.

## More Docs

- [Package architecture](https://github.com/chakra-email/chakra-email/blob/main/docs/package-architecture.md)
- [Components](https://github.com/chakra-email/chakra-email/blob/main/docs/components.md)
- [Rendering](https://github.com/chakra-email/chakra-email/blob/main/docs/rendering.md)

## Help and contributing

See the [project README](https://github.com/chakra-email/chakra-email#readme), [open an issue](https://github.com/chakra-email/chakra-email/issues), or read the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## License

MIT

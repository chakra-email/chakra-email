# @chakra-email/core

Email-safe React primitives, theme resolution, and HTML/plain-text rendering for Chakra Email adapters and custom tooling.

[Documentation](https://chakra.email/docs/package-architecture) · [Getting started](https://chakra.email/docs/getting-started) · [Examples](https://chakra.email/examples) · [Issues](https://github.com/chakra-email/chakra-email/issues)

[![npm](https://img.shields.io/npm/v/%40chakra-email%2Fcore?style=flat-square)](https://www.npmjs.com/package/@chakra-email/core)
[![NPM](https://img.shields.io/npm/l/%40chakra-email%2Fcore?style=flat-square)](https://github.com/chakra-email/chakra-email/blob/main/LICENSE)

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Most applications should install [`chakra-email`](https://chakra.email/docs/getting-started), or [`@chakra-email/chakra-v2`](https://chakra.email/docs/chakra-v2) for an existing v2 theme. Install core directly when building an adapter or integrating rendering into custom tooling. `@chakra-ui/react` is not required.

## Install

```bash
npm install @chakra-email/core react react-dom
```

React 18 and 19 are supported. Packages are ESM-only: use `import` in an ESM-capable server or build tool. Node.js 24 is recommended; the published engine compatibility floor remains Node.js 20.19.

## Quick start for tooling authors

Use focused component, theme, and rendering entry points without either theme adapter:

<!-- quickstart:start -->

```tsx
import { Body, Head, Html, Text } from '@chakra-email/core/components';
import { renderEmail } from '@chakra-email/core/render';
import { ThemeProvider } from '@chakra-email/core/theme';

export default function WelcomeEmail() {
  return (
    <ThemeProvider>
      <Html lang="en">
        <Head>
          <title>Welcome to Acme</title>
        </Head>
        <Body>
          <Text>Welcome! Your account is ready.</Text>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

export async function renderWelcomeEmail() {
  const { html, text } = await renderEmail(<WelcomeEmail />);
  return { html, text };
}
```

<!-- quickstart:end -->

Call `renderWelcomeEmail()` in server-side tooling and hand `html` and `text` to your delivery provider. Rendering does not send mail. For renderer adapters, the `chakraEmailRenderer` export from `@chakra-email/core/render` implements the shared preview renderer contract.

## Includes

- React document, layout, text, table, and Markdown-body primitives.
- Theme-aware fonts and optional safe web-font declarations.
- Chakra-style style prop mapping and token/semantic-token resolution.
- Email-safe component recipes and multipart slot recipes.
- HTML and plain-text rendering from a single React render.
- Configurable URL policies and bounded-output helpers.

Focused entry points are `@chakra-email/core/components`, `@chakra-email/core/render`, `@chakra-email/core/theme`, `@chakra-email/core/system`, and `@chakra-email/core/security`. The package root re-exports the shared surface.

Read [theming](https://chakra.email/docs/theming) for `ThemeProvider`, recipe keys, multipart slots, and optional Chakra UI `createSystem()` integration.

## Safety

Use absolute public URLs for links and images, or valid `cid:` image attachments. The default policy omits unsafe and relative URLs; `EmailRenderError`, `strictEmailSecurityPolicy`, and `strictEmailOutputLimits` from `@chakra-email/core/security` enable stricter handling and final HTML/text byte limits. Sanitize raw HTML before admitting it to Markdown, and test representative email clients rather than assuming browser feature support.

## Next steps

- [Package architecture](https://chakra.email/docs/package-architecture)
- [Components](https://chakra.email/docs/components)
- [Rendering and renderer adapters](https://chakra.email/docs/rendering)
- [Local preview](https://chakra.email/docs/preview)

## Help and contributing

[Open an issue](https://github.com/chakra-email/chakra-email/issues) or read the [contribution guidelines](https://github.com/chakra-email/chakra-email/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-email/chakra-email/security/policy).

## License

MIT

# Packages and composition

## Choose the application-facing package

| Need                                                      | Package                     |
| --------------------------------------------------------- | --------------------------- |
| Chakra UI v3-style tokens and ordinary templates          | `chakra-email`              |
| Chakra UI v2-style flat themes                            | `@chakra-email/chakra-v2`   |
| Adapter development or custom tooling                     | `@chakra-email/core`        |
| Local template discovery and preview                      | `@chakra-email/preview`     |
| React Email rendering semantics in preview/export tooling | `@chakra-email/react-email` |
| GFM content mapped to email-safe components               | `@chakra-email/markdown`    |
| Themeable fenced code with an optional highlighter        | `@chakra-email/code-block`  |

Most applications should start with `chakra-email`. Do not add `core` directly
unless the application is building an adapter or needs its lower-level
contract. React Email, Markdown, code highlighting, and previewing remain
optional so they do not enlarge the production template runtime by default.

## Compose a portable document

Use an explicit shell and keep application data in typed props:

```tsx
import {
  Body,
  Button,
  ChakraEmailProvider,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'chakra-email';

export interface AccountEmailProps {
  firstName: string;
  actionUrl: string;
}

export function AccountEmail({ firstName, actionUrl }: AccountEmailProps) {
  return (
    <ChakraEmailProvider theme={emailTheme}>
      <Html lang="en">
        <Head />
        <Preview>Your account is ready.</Preview>
        <Body bg="bg.subtle" color="fg" m={0}>
          <Container bg="bg" border="1px solid" borderColor="border" p={6}>
            <Heading as="h1">Welcome, {firstName}</Heading>
            <Text color="fg.muted">Your account is ready to use.</Text>
            <Button href={actionUrl}>Open account</Button>
          </Container>
        </Body>
      </Html>
    </ChakraEmailProvider>
  );
}
```

Read the installed component prop types before assuming browser-component
parity. Chakra Email accepts a deliberate set of Chakra-style props and emits
email-safe inline styles. Important layout should use table-backed primitives:

- `Container` for a centered bounded surface;
- `Section` for full-width regions;
- `Row` and `Column` for explicit multi-column structure;
- `Stack` and `Spacer` for vertical rhythm;
- `Button` for an email-safe CTA table and anchor;
- semantic `Table` components for actual tabular data.

`Button` provides a Word-based Outlook padding fallback but does not generate
custom VML. Treat rounded corners and a fully clickable padded area in legacy
Outlook as progressive enhancements unless the product explicitly requires a
custom VML implementation.

## Keep URLs portable

Delivered email has no dependable document base URL.

- Give `Link` and `Button` absolute HTTP(S), `mailto:`, `tel:`, or fragment
  destinations.
- Give `Img` an absolute HTTP(S) URL or a `cid:` that matches an attached MIME
  part.
- Resolve relative CMS or Markdown URLs against a deliberate public base before
  passing them to components.
- Do not infer production asset URLs from the preview server's `/assets/`
  paths.

Relative, protocol-relative, credentialed, control-bearing, malformed,
oversized, and unsupported component URLs are omitted rather than guessed.
Use the focused `chakra-email/security` entry point for renderer-wide policy,
fail-closed errors, and output limits.

## Choose a migration path

For Chakra UI v2 theme objects, use `ChakraEmailV2Provider`. The adapter
normalizes `rem` and `em` lengths to pixels, resolves v2 semantic tokens in the
default mode, and drops runtime-only theme keys. Do not pass v2 semantic token
shapes directly to the v3/core resolver.

For existing React Email templates, keep their components and configure the
optional `reactEmailRenderer()` adapter in preview tooling. Chakra Email and
React Email components may coexist in a template; migrate incrementally when
that better preserves behavior.

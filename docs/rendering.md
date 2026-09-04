# Rendering

Chakra Email renders React elements to static email HTML with React DOM server rendering.
Server and build-only modules should import from `chakra-email/render`; the root
entry remains available when a module also renders Chakra Email components.

## HTML

```tsx
import { render } from 'chakra-email/render';
import { WelcomeEmail } from './WelcomeEmail';

const html = await render(<WelcomeEmail />, { pretty: true });
```

`render` adds an XHTML transitional email doctype when the rendered document does not already include a doctype.

## Plain Text

```tsx
import { renderPlainText } from 'chakra-email/render';

const text = await renderPlainText(<WelcomeEmail />);
```

Plain-text rendering is useful for providers that accept both HTML and text bodies.

Use `renderEmail` when a provider accepts both bodies. It renders the React tree
once so dynamic values cannot drift between the HTML and plain-text output:

```tsx
import { renderEmail } from 'chakra-email/render';

const { html, text } = await renderEmail(<WelcomeEmail />, { pretty: true });
```

React 19 image preload hints are removed centrally before any HTML, plain-text,
preview, or export result is returned.

You can also request plain text through `render`:

```tsx
const text = await render(<WelcomeEmail />, { plainText: true });
```

Plain-text conversion uses `html-to-text` and accepts its conversion options:

```tsx
const text = await renderPlainText(<WelcomeEmail />, {
  selectors: [{ selector: 'h1', options: { uppercase: true } }],
});
```

Add `data-skip-in-text="true"` to rendered content that should remain in the
HTML version but be omitted from the plain-text version. Chakra Email's semantic
`Table` component is formatted as a readable data table automatically.

## URL and output policies

`Link`, `Button`, and `Img` use strict URL defaults. They reject credentials,
raw or encoded control characters, surrounding whitespace, malformed or
relative URLs, unsupported protocols, and URLs over 2,048 UTF-8 bytes. Invalid
URLs are omitted by default. Transactional systems can fail closed for the
whole render:

```tsx
import { strictEmailOutputLimits } from 'chakra-email/security';
import { renderEmail } from 'chakra-email/render';

const output = await renderEmail(<WelcomeEmail />, {
  outputLimits: strictEmailOutputLimits,
  urlPolicy: {
    link: { onInvalidUrl: 'throw' },
    image: { onInvalidUrl: 'throw' },
  },
});
```

Use `EmailSecurityPolicyProvider` for a subtree or `urlPolicy` on an individual
`Link`, `Button`, or `Img`. Only opt into additional protocols or credentials
when a delivery contract explicitly requires them. Rejections use
`EmailRenderError` codes such as `UNSAFE_URL` and `OUTPUT_TOO_LARGE`; messages
never include the rejected URL or rendered content.

## Renderer adapters

Custom development tools can accept the exported `EmailRenderer` contract.
`chakraEmailRenderer` is the default implementation and returns `{ html, text }`
from one render pass.

## Debug Formatting

Use `pretty: true` while developing templates:

```tsx
const html = await render(<WelcomeEmail />, { pretty: true });
```

For production sending, either pretty or compact HTML is valid.

# Rendering

Chakra Email renders React elements to static email HTML with React DOM server rendering.

## HTML

```tsx
import { render } from 'chakra-email';
import { WelcomeEmail } from './WelcomeEmail';

const html = await render(<WelcomeEmail />, { pretty: true });
```

`render` adds an XHTML transitional email doctype when the rendered document does not already include a doctype.

## Plain Text

```tsx
import { renderPlainText } from 'chakra-email';

const text = await renderPlainText(<WelcomeEmail />);
```

Plain-text rendering is useful for providers that accept both HTML and text bodies.

You can also request plain text through `render`:

```tsx
const text = await render(<WelcomeEmail />, { plainText: true });
```

## Debug Formatting

Use `pretty: true` while developing templates:

```tsx
const html = await render(<WelcomeEmail />, { pretty: true });
```

For production sending, either pretty or compact HTML is valid.

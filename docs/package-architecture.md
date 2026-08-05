# Package Architecture

The workspace publishes four packages:

- `chakra-email` - main application-facing package.
- `@chakra-email/chakra-v2` - adapter for Chakra UI v2-style theme objects.
- `@chakra-email/core` - shared components, renderer, style system, theme resolver, and tests.
- `@chakra-email/preview` - development-only CLI, template runner, local server, and bundled browser UI.

## Why Rendering Lives In Core

The renderer is shared by both public adapters. Keeping it in `@chakra-email/core` avoids duplicating render behavior and keeps versioning simple.

The runtime packages expose render utilities through their root exports and `./render` subpaths:

```ts
import { render } from 'chakra-email';
import { renderPlainText } from 'chakra-email/render';
```

## Why Preview Is A Separate Package

Previewing is a development workflow, not part of a delivered email or an
application runtime. `@chakra-email/preview` depends on the core renderer but
keeps Vite, file watching, the local HTTP server, and browser UI out of the
component packages. It works from npm scripts in any repository; Nx consumers
can attach the same CLI to a continuous, non-cacheable target.

## Future Package Splits

Potential future splits can be added without changing the main package API:

- `@chakra-email/components` if component-only installs become common.
- `@chakra-email/render` if render-only tooling becomes common.

For the initial release, these four packages keep runtime adapters, shared
rendering, and development tooling behind clear boundaries.

## Local Package Testing With Yalc

Use the root Nx yalc targets when you want to test the publishable packages in another local app:

```bash
npx nx run chakra-email-monorepo:yalc-publish
```

That target builds the four publishable packages, then publishes them to your local yalc store in dependency-safe order:

1. `@chakra-email/core`
2. `@chakra-email/preview`
3. `chakra-email`
4. `@chakra-email/chakra-v2`

If the packages are already installed in a consumer app with yalc and you want to push updates immediately, run:

```bash
npx nx run chakra-email-monorepo:yalc-push
```

In the consumer app, add whichever packages you want to test:

```bash
yalc add chakra-email @chakra-email/core
yalc add @chakra-email/chakra-v2
yalc add --dev @chakra-email/preview
```

The root npm aliases are available too:

```bash
npm run yalc:publish
npm run yalc:push
```

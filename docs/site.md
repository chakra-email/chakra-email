# Documentation Site

The canonical documentation site lives in `apps/site`.

It is an Nx-managed Vite application that imports the markdown files in `docs/` as raw content and renders them into the site. Keep long-form product documentation in `docs/` first, then expose it through the site navigation. This keeps the repository README, npm package docs, and website from drifting apart.

## Commands

The committed dependencies use pinned public Chakra Docs and Postkit packages.
For this development branch, run `npm run site:yalc` after installation to use
the current local Chakra Docs build. This links `chakra`, `core`, `search`, and
`shiki`; Postkit remains on its public release. `@postkit/core` and
`@postkit/unfurl` are installed transitively by `@postkit/react`.
Use the repository's pinned Node 24
runtime (`nvm use`); Chakra Docs requires Node 22.22 or newer. This does not
change the published Chakra Email packages' Node compatibility floor.

```bash
npm ci
npm run site:dev
npm run site:build
npm run site:preview
```

`npm run build` also builds the site because Nx discovers the app target.

For local development, `npm run site:yalc` links Chakra Docs and
`npm run yalc:link:postkit --workspace site` links Postkit from your local yalc
store. Yalc files and registrations stay untracked; repeat the link command
after `npm ci`. To return to public packages
and unregister the site from future local pushes, run:

```bash
npm exec --workspace site -- yalc remove --all
npm ci
```

### Clean-install release prerequisite

Publish the upcoming Chakra Docs release first, update the site to that immutable
version, and refresh the lockfile. Then run `npm ci`, `npm run site:build`, and
the site tests without yalc links before releasing or deploying Chakra Email.
The current local UI refinements must not depend on mutable yalc artifacts in production.
Chakra Docs' focused `/theme` and Postkit's `/remark` entry points keep theme and
Markdown tooling imports separate. Release regression
tests check registry URLs, integrity hashes, and versions for both package
families. Do not externalize unresolved browser imports to make the gate pass.

## Production Hosting

The site is a static Vite build. Publish `apps/site/dist` with any static host.
Configure an HTML fallback to `index.html` for application routes such as
`/docs/getting-started`, `/examples`, `/packages`, and `/withoss` so direct visits
and browser refreshes work.
For a host that serves the site below a repository path, provide the public base
path at build time:

```bash
SITE_BASE_PATH=/chakra-email/ npm run site:build
```

Use `/` (the default) when the site is served from its own domain. The base path
is applied to generated asset URLs, so the same source can be deployed to either
location without hard-coded root links.

## Shared site design

The welcome page lives at `/`, with dedicated documentation under `/docs`.
Examples and package entrypoints have their own pages. Chakra Docs supplies
the layout, mobile navigation, search, breadcrumbs, page actions, and code
blocks; Postkit renders canonical Markdown documents.

The site matches Chakra Docs and react-fathom: a compact header, neutral theme,
system light/dark mode, Suisse Intl typography, 2026 credit/license footer,
shared OSS artwork at `/withoss`, and a black COMMUNE sub-footer. Styling lives
in `src/theme` and Chakra props, not standalone CSS or inline `style` props.
The shared Fontstack kit is loaded once in `index.html`:
`https://kits.fontstack.com/kit/o0v0t0oi.css`. Ensure it allows the production
domain and `chakra-email.test`.

This theme is for the documentation site only. The email renderer and preview
application keep their separate themes and color-mode behavior.

## Content Sources

- `docs/*.md` - canonical documentation pages rendered in the site.
- `examples/*` - runnable example source linked from the site and previewed inline.
- `packages/*/README.md` - npm package landing pages.
- `README.md` - repository overview and contributor entrypoint.

## Adding A Page

1. Add a markdown file to `docs/`.
2. Import it in `apps/site/src/content.ts`.
3. Add a `docPages` entry with a stable `id`, title, summary, and GitHub source link.

## Adding An Example

1. Add the example under `examples/`.
2. Import its source file in `apps/site/src/content.ts`.
3. Add an `examples` entry with a GitHub link and short description.

Prefer examples that can be copied into a real project without hidden setup. If an example needs extra packages, list them in the example README.

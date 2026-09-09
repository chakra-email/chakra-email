# Documentation Site

The canonical documentation and marketing site lives in `apps/site`.

It is an Nx-managed Vite application that imports the markdown files in `docs/` as raw content and renders them into the site. Keep long-form product documentation in `docs/` first, then expose it through the site navigation. This keeps the repository README, npm package docs, and website from drifting apart.

## Commands

The current development site uses local yalc builds of Chakra Docs and Postkit
(Chakra Docs 0.2.0 and Postkit 0.1.1). Publish those packages to your local yalc
store first, then restore the site's links after `npm install` or `npm ci`:

```bash
npm run site:yalc
npm run site:dev
npm run site:build
npm run site:preview
```

`npm run build` also builds the site because Nx discovers the app target.

### Clean-install release prerequisite

The site's yalc links are local, ignored artifacts, not reproducible npm
dependencies. A passing local build with these links does **not** establish
that the GitHub CI or Pages jobs can build a fresh checkout. The currently
published 0.1.0 upstream packages lack the focused `/theme` and `/remark`
exports used by this site.

Before releasing from clean CI, publish compatible upstream packages and
declare the site's dependencies in `apps/site/package.json` with a committed
lockfile, or provide an explicit, reviewed pinned-source build for them.
Verify from a fresh checkout with no yalc store; do not bypass the site checks
or externalize its unresolved browser imports to make the gate pass.

## Production Hosting

The site is a static Vite build. Publish `apps/site/dist` with any static host.
For a host that serves the site below a repository path, provide the public base
path at build time:

```bash
SITE_BASE_PATH=/chakra-email/ npm run site:build
```

Use `/` (the default) when the site is served from its own domain. The base path
is applied to generated asset URLs, so the same source can be deployed to either
location without hard-coded root links.

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

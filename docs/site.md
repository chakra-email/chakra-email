# Documentation Site

The canonical documentation and marketing site lives in `apps/site`.

It is an Nx-managed Vite application that imports the markdown files in `docs/` as raw content and renders them into the site. Keep long-form product documentation in `docs/` first, then expose it through the site navigation. This keeps the repository README, npm package docs, and website from drifting apart.

## Commands

```bash
npm run site:dev
npm run site:build
npm run site:preview
```

`npm run build` also builds the site because Nx discovers the app target.

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

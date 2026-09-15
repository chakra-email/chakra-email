# Documentation Site

The canonical documentation and marketing site lives in `apps/site`.

It is an Nx-managed Vite application that imports the markdown files in `docs/` as raw content and renders them into the site. Keep long-form product documentation in `docs/` first, then expose it through the site navigation. This keeps the repository README, npm package docs, and website from drifting apart.

## Commands

The site uses published Chakra Docs and Postkit `0.2.0` packages, pinned in
`apps/site/package.json` and the root lockfile. `@chakra-docs/search` is installed
transitively by `@chakra-docs/chakra`; `@postkit/core` and `@postkit/unfurl` are
installed transitively by `@postkit/react`. Use the repository's pinned Node 24
runtime (`nvm use`); Chakra Docs requires Node 22.22 or newer. This does not
change the published Chakra Email packages' Node compatibility floor.

```bash
npm ci
npm run site:dev
npm run site:build
npm run site:preview
```

`npm run build` also builds the site because Nx discovers the app target.

For optional local development, `npm run site:yalc` links Chakra Docs and
`npm run yalc:link:postkit --workspace site` links Postkit from your local yalc
store. Neither is required for a normal build. To return to public packages
and unregister the site from future local pushes, run:

```bash
npm exec --workspace site -- yalc remove --all
npm ci
```

### Clean-install release prerequisite

Run `npm ci`, `npm run site:build`, and the site tests without yalc links before
releasing. Both Chakra Docs' focused `/theme` entry point and Postkit's `/remark`
entry point are supplied by the locked public releases. Release regression
tests check registry URLs, integrity hashes, and versions for both package
families. Do not externalize unresolved browser imports to make the gate pass.

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

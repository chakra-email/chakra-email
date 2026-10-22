# Documentation Site

The canonical documentation site lives in `apps/site`.

It is an Nx-managed Next.js App Router application. Documentation and example sources are loaded on the server and pages are prerendered with their metadata and structured data. Search uses a bounded `/api/docs/search` endpoint instead of shipping the full index to the browser. Keep long-form product documentation in `docs/` first, then expose it through the site navigation. This keeps the repository README, npm package docs, and website from drifting apart.

## Commands

Use the repository's pinned Node 24
runtime (`nvm use`); Chakra Docs requires Node 22.22 or newer. This does not
change the published Chakra Email packages' Node compatibility floor.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run site:dev
pnpm run site:build
pnpm run site:preview
```

`pnpm run build` also builds the site because Nx discovers the app target.

### Optional local package testing

Use `pnpm run site:yalc` to link a local Chakra Docs build, or
`pnpm --filter site yalc:link:postkit` to link Postkit from your local yalc store.
These links are for dependency development, not production deployment.
Yalc files and registrations stay untracked. Remove links and restore the
committed dependency versions before validating a clean build:

```bash
pnpm --filter site exec yalc remove --all
pnpm install --frozen-lockfile
```

### Clean-install release prerequisite

Production builds must resolve every site dependency from an immutable public
release, without a local yalc store. Run `pnpm install --frozen-lockfile`,
`pnpm run site:build`, and the site tests from a clean checkout before deploying.
See the [deployment notes](https://github.com/chakra-email/chakra-email/blob/main/apps/site/DEPLOYMENT.md)
for environment variables and dependency preparation.
Chakra Docs' focused `/theme` and Postkit's `/remark` entry points keep theme and
Markdown tooling imports separate. Release regression
tests check registry URLs, integrity hashes, and versions for both package
families. Do not externalize unresolved browser imports to make the gate pass.

## Production Hosting

The production site deploys on Vercel with Root Directory `apps/site`, the Next.js
preset, and the committed `apps/site/vercel.json`. See the
[deployment settings](https://github.com/chakra-email/chakra-email/blob/main/apps/site/DEPLOYMENT.md)
for environment variables and the preview verification checklist. npm publication
does not deploy the site; the former GitHub Pages workflow has been retired.

Use the default Next.js output (`.next`), not `dist` or `out`. Do not enable static export: the search API needs the Next.js runtime. In Vercel, clear any Output Directory override.

### Crawler discovery files

Next route handlers prerender `/sitemap.xml`, `/robots.txt`, `/llms.txt`, and `/llms-full.txt`. Crawlers receive XML or text, never an app fallback.
The sitemap includes public site pages and published docs, but not the `/docs`
alias, draft or hidden docs, or social-image capture templates. Robots advertises
the canonical sitemap and blocks HTML capture templates without blocking
renderer-generated social PNGs.

All discovery links use the canonical production domain, `https://chakra.email`. Rebuild the site after
changing docs; no separate package release is needed.

## Shared site design

The welcome page lives at `/`, with dedicated documentation under `/docs`.
Examples and package entrypoints have their own pages. Chakra Docs supplies
the layout, mobile navigation, search, breadcrumbs, page actions, and code
blocks; Postkit renders canonical Markdown documents.

The site matches Chakra Docs and react-fathom: a compact header, neutral theme,
system light/dark mode, Suisse Intl typography, 2026 credit/license footer,
shared OSS artwork at `/withoss`, and a black COMMUNE sub-footer. Styling lives
in `src/theme` and Chakra props, not standalone CSS or inline `style` props.
The shared Fontstack kit is loaded once in `src/app/layout.tsx`:
`https://kits.fontstack.com/kit/o0v0t0oi.css`. Ensure it allows the production
domain and `chakra-email.test`.

This theme is for the documentation site only. The email renderer and preview
application keep their separate themes and color-mode behavior.

## Open Graph image capture

`/og-image` matches the react-fathom capture page: a fixed 1200 × 630 canvas,
Suisse typography, black/white colors, and COMMUNE credit. It omits site
navigation, footers, analytics, and color-mode controls. Review locally at
`https://chakra-email.test/og-image`.

Page-specific templates follow the same convention as ryanhefner.com:

```text
/social-image                          -> welcome capture
/docs/getting-started/social-image      -> Getting Started capture
/examples/social-image                  -> Template examples capture
```

The equivalent internal routes are `/og-image`, `/og-image/docs/getting-started`,
and `/og-image/examples`. Captures use the matching page's title and description;
unknown page paths return a real HTTP 404. Next prerenders these extensionless HTML routes along with the public pages.

For the OpenGraphs generation flow, use the corresponding
`/<page>/social-image.png` **template URL** in the renderer integration. It
captures the extensionless HTML route. The configured OpenGraphs renderer must
serve the resulting PNG; do not rewrite `.png` requests to an HTML page
or return HTML with an image content type.

Optional `title` and `description` query parameters customize the copy:

```text
/og-image?title=Email%20preview&description=Explore%20templates%20and%20variants%20locally.
```

Blank values use defaults; whitespace is normalized and copy is limited to
100/200 Unicode code points with visual line clamping. Values are plain text,
never executable markup. Wait for `[data-og-ready="true"]` before capturing
so the current copy, web fonts, and wordmark have settled.

For OpenGraphs, use the publicly deployed capture URL and a 1200 × 630
viewport. Local `.test` domains are not reachable by hosted capture services.
The Fontstack kit must allow the capture hostname. Next emits noindex metadata during server rendering and sets `X-Robots-Tag: noindex, nofollow` on capture routes in development and production. Keep capture routes out of sitemap generation.
Use the generated PNG/JPEG or hosted image URL for `og:image` and
`twitter:image` metadata, **not** the HTML capture URL.

## Content Sources

- `docs/*.md` - canonical documentation pages rendered in the site.
- `examples/*` - runnable example source linked from the site and previewed inline.
- `packages/*/README.md` - npm package landing pages.
- `README.md` - repository overview and contributor entrypoint.

## Adding A Page

1. Add a markdown file to `docs/`.
2. Add a `docPageDefinitions` entry in `apps/site/src/doc-pages.ts` with a stable
   `id`, title, summary, source filename, and GitHub source link. The site and its
   discovery files share these definitions.

## Adding An Example

1. Add the example under `examples/`.
2. Add its source path to `exampleSources` in `apps/site/src/server/content.ts`.
3. Add an `exampleLinks` entry in `apps/site/src/site-resources.ts` with a GitHub link and short description.

Prefer examples that can be copied into a real project without hidden setup. If an example needs extra packages, list them in the example README.

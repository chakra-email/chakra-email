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
unknown page paths show the not-found page. This site is Vite, so its SPA handles
the aliases rather than a Next config. The static host must serve `index.html`
for these **extensionless HTML** routes, as it does for ordinary docs routes.

For the OpenGraphs generation flow, use the corresponding
`/<page>/social-image.png` **template URL** in the renderer integration. It
captures the extensionless HTML route. The configured OpenGraphs renderer must
serve the resulting PNG; do not send `.png` requests through the SPA fallback
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
The Fontstack kit must allow the capture hostname. Because this site is a
client-rendered SPA, the capture route's robots meta tag is applied after
JavaScript runs; also set `X-Robots-Tag: noindex, nofollow` for `/og-image`,
`/og-image/*`, and `/*/social-image` (including `/social-image` and trailing
slashes) on the static host. Vite development and preview servers already set
this header for capture routes. Keep capture routes out of sitemap generation.
Use the generated PNG/JPEG or hosted image URL for `og:image` and
`twitter:image` metadata, **not** the HTML capture URL.

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

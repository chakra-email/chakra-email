# Deploying chakra.email

## Vercel project settings

Import `chakra-email/chakra-email` and use these project settings:

- Root Directory: `apps/site`. Enable **Include source files outside of the
  Root Directory in the Build Step** so the workspace packages and docs are available.
- Framework Preset: **Vite**, not Next.js.
- Node.js: **24.x** (local development and CI pin `24.18.0`).
- Production branch: `main`; production domain: `chakra.email`.
- Use the committed `vercel.json` for install/build commands and Output Directory
  `dist`, relative to `apps/site` (the repository path is `apps/site/dist`).
- Leave `SITE_BASE_PATH` unset for the production domain; its default is `/`.

The install command enables the pinned pnpm version at the repository root and
performs a frozen workspace install. The build command runs `pnpm run site:build`
from that root. This is a static Vite site: do not use `.next`, `out`, or a
Next.js framework preset. Public dependencies require no npm publishing token
or GitHub App credentials for deployment.

Vercel serves the generated route-specific HTML files with extensionless URLs.
There is deliberately no catch-all SPA rewrite: unknown paths should return
the generated `404.html` with status 404, not the homepage with status 200.
See [Vercel's configuration reference](https://vercel.com/docs/project-configuration/vercel-json).

Deploy a preview first. Check a direct visit and refresh on
`/docs/getting-started`, `/examples`, `/packages`, and `/withoss`, verify an
unknown path returns 404, and check the discovery URLs below. After production
deployment, verify canonical URLs use `https://chakra.email` and Fathom receives
pageviews. GitHub Actions still verifies the code and publishes npm packages;
the old GitHub Pages deployment workflow has been retired.

## Analytics environment variables

The documentation site uses React Fathom for initial pageviews, SPA navigation,
and docs interaction events. The email preview app and delivered email HTML
do not include analytics.

Set `VITE_FATHOM_SITE_ID` and optionally `VITE_FATHOM_CUSTOM_DOMAIN` before
building the site. These are public Vite values, not secrets. An empty ID
disables script loading and network tracking. Only event names are sent:
search strings, clipboard contents, and feedback comments are excluded.
Pageview URLs omit query strings and fragments; OG capture pages are untracked.

The site uses the published `react-fathom@0.3.0` release and Chakra Docs packages
pinned to `0.3.0`. No local yalc copies of these packages are needed for a clean
CI or deployment install.

Build with `pnpm nx run site:build` using the pinned Node 24 and pnpm versions.
The build cache includes both analytics environment variables, so changing a
site ID does not reuse an artifact compiled for another analytics site.

## Search engine discovery

The site uses published `next-meta@0.5.0` through its framework-free core.
The Vite build emits route-specific HTML heads for public pages, the `/docs`
alias, error pages, and social-image capture templates. Serve these generated
`<route>/index.html` files directly, and use the generated
`404.html` for unknown routes with an HTTP 404 status. No Next.js runtime
is installed or needed. Client navigation uses the same metadata resolver and
updates canonical, Open Graph, and Twitter tags without duplicates.

Capture and not-found pages are marked noindex. Capture pages do not advertise
social cards. No image URLs are invented: this site has no static social PNG
and PNG generation remains owned by the external image renderer.

The build generates `sitemap.xml` and `robots.txt` in `apps/site/dist`. The sitemap
lists the home, examples, packages, OSS credits, and published documentation
pages using `https://chakra.email`. Draft and hidden docs and social-image
capture templates are excluded. Robots advertises the sitemap and disallows
HTML capture templates while keeping renderer-generated social PNGs crawlable.

Both files are also available on the development server. `SITE_BASE_PATH` is
respected for subpath deployments; crawlers look for `robots.txt` at the domain
root, so a subpath host must also publish or merge those rules into its root
robots file. Serve the generated files directly, with
`application/xml; charset=utf-8` for the sitemap and `text/plain; charset=utf-8`
for robots. Check both URLs after deploying. No npm publish is required.

## LLM documentation

The Vite build writes `llms.txt` and `llms-full.txt` to `apps/site/dist`, and the
development server serves the same text endpoints. They use the site's shared
documentation manifest: the index links to canonical `https://chakra.email`
pages and the full file contains the Markdown bodies. Draft and hidden pages
are excluded, and links respect `SITE_BASE_PATH` when deploying under a subpath.
Documentation source files are included in the Nx build-cache inputs. Rebuild
and deploy the site after editing docs; no npm publish is needed.

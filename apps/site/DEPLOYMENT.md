# Deploying chakra.email

## Vercel project settings

- Root Directory: `apps/site`. Enable **Include source files outside of the Root Directory in the Build Step** so documentation and example sources are available.
- Framework Preset: **Next.js**. Do not select the separate Vite preview app.
- Node.js: **24.x** (development and CI pin `24.18.0`).
- Production branch: `main`; production domain: `chakra.email`.
- Install and Build Commands: use the committed `vercel.json` defaults.
- Output Directory: **clear the override and leave automatic**. Next uses `.next`; do not enter `out`, `dist`, `docs/out`, or a repository-relative output path.

The install command enables the repository's pinned pnpm version and performs a frozen workspace install. The build command runs `pnpm run site:build` from the repository root. Next prerenders the documentation and discovery endpoints while retaining a runtime for `/api/docs/search`. Do not enable `output: 'export'` or add a catch-all SPA rewrite.

Public dependencies need no npm publishing token or GitHub App credentials for deployment. Publishing the npm packages does not deploy the site. The email preview application remains Vite-based and is not the Vercel project root.

If the Vercel project was previously configured for Vite, update the Framework Preset and remove its saved `dist`/`out` Output Directory override before redeploying. A dashboard override can survive repository changes.

## Analytics environment variables

Set these in Vercel before building:

- `NEXT_PUBLIC_FATHOM_SITE_ID`: the Fathom site ID. Leave unset to disable analytics.
- `NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN`: optional custom tracking hostname, without a scheme or path.

These public build-time settings replace the old `VITE_FATHOM_*` names. Add them to Production and Preview environments as desired, then rebuild. Nx includes both values in the build-cache inputs. No other environment variables are required.

The site uses published React Fathom for one initial pageview and subsequent Next navigation. Query strings, fragments, search text, clipboard data, and feedback comments are excluded. Social-image captures are untracked. The preview app and delivered email HTML do not include analytics.

## Metadata and discovery

The Next Metadata API uses `next-meta/app` for canonical, Open Graph, and Twitter metadata. Public pages include server-rendered JSON-LD through React Structured. Next returns real 404 responses for unknown pages. Capture pages are noindex in both HTML metadata and response headers, and do not advertise normal social cards.

The following native route handlers are prerendered from the same documentation manifest:

- `/sitemap.xml`: public pages and published docs, excluding aliases, drafts, hidden pages, and captures.
- `/robots.txt`: canonical sitemap plus HTML-capture exclusions.
- `/llms.txt`: canonical documentation index.
- `/llms-full.txt`: complete published Markdown bodies.

Search is served through `/api/docs/search` with bounded queries and compact results; its complete index stays on the server. The build traces Markdown and example source files from outside `apps/site` so runtime functions can access them on Vercel.

PNG generation remains owned by the configured external image renderer. Do not rewrite renderer-owned `.png` URLs to HTML.

## Verification checklist

Run `pnpm nx build site`, `pnpm nx run site:typecheck`, `pnpm nx run site:test --coverage --maxWorkers=1`, and `pnpm nx run site:smoke` using the pinned Node and pnpm versions.

Deploy a preview and verify direct visits and refreshes on `/`, `/docs/getting-started`, `/examples`, `/packages`, and `/withoss`; an unknown page must return 404. Check all four discovery endpoints, API search, mobile navigation, highlighted code/copy buttons, and `/og-image`. Canonical URLs must use `https://chakra.email`. Confirm Fathom receives pageviews after production deployment.

# chakra.email analytics

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

The build generates `sitemap.xml` and `robots.txt` in `apps/site/dist`. The sitemap
lists the home, examples, packages, OSS credits, and published documentation
pages using `https://chakra.email`. Draft and hidden docs and social-image
capture templates are excluded. Robots advertises the sitemap and disallows
HTML capture templates while keeping renderer-generated social PNGs crawlable.

Both files are also available on the development server. `SITE_BASE_PATH` is
respected for subpath deployments; crawlers look for `robots.txt` at the domain
root, so a subpath host must also publish or merge those rules into its root
robots file. Serve the generated files before any SPA fallback, with
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

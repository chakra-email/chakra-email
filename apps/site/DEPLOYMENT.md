# chakra.email analytics

The documentation site uses React Fathom for initial pageviews, SPA navigation,
and docs interaction events. The email preview app and delivered email HTML
do not include analytics.

Set `VITE_FATHOM_SITE_ID` and optionally `VITE_FATHOM_CUSTOM_DOMAIN` before
building the site. These are public Vite values, not secrets. An empty ID
disables script loading and network tracking. Only event names are sent:
search strings, clipboard contents, and feedback comments are excluded.
Pageview URLs omit query strings and fragments; OG capture pages are untracked.

The site temporarily uses the fixed React Fathom yalc build. After publishing
React Fathom, replace `file:.yalc/react-fathom` in the site's package manifest
with that immutable npm version and regenerate the pnpm lockfile. Replace
local Chakra Docs pins with its new npm release too before a clean deployment.

Build with `pnpm nx run site:build` using the pinned Node 24 and pnpm versions.
The build cache includes both analytics environment variables, so changing a
site ID does not reuse an artifact compiled for another analytics site.

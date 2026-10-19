# Changelog

## Unreleased

### Added

- Background default-template lint summaries update every sidebar row over SSE,
  including unvisited templates, with debounced, bounded work, stale-generation
  cancellation, late-client replay, and priority for explicit renders.
- Config and template `previewFrom` metadata powers the inbox, Info, and `.eml`
  sender headers. Authenticated **Open in editor** opens discovered templates
  only on loopback hosts and can be disabled with `openInEditor: false`.
- Selectable Checks cards outline affected elements in Preview and Compare,
  link to highlighted HTML lines, and filter by curated client breakages.
- Curated known-client breakage metadata on compatibility findings, reviewed
  against Can I Email in October 2026 and excluding partial/conditional results.
- `chakra-email-preview check` and `checkTemplates()` for CI reports across
  templates and variants, with strict mode, JSON output, severity overrides,
  recoverable render failures, and opt-in network link checks.
- Six preview checks for placeholders, rounded-button fallbacks, color-scheme
  metadata, subject/preheader lengths, and accessible link text. Element findings
  now include unique selectors for the rendered HTML.
- **Copy as variant** copies a named `previewVariants` entry containing only
  props that differ from the template's base fixture, without changing files.
- A redesigned local preview workspace with a single top bar, filterable template
  navigation, inbox preview, Props / Info / Checks tabs, live debounced Fields
  and JSON editors, Compare view, command palette, and message status bar.
- Additive preview API metadata for folder groups, the effective lint catalog,
  rules run, and render duration; passed checks use actual render results.
- Local multipart `.eml` exports alongside HTML/plain-text exports, with
  quoted-printable bodies and UTF-8 encoded subjects.

- A shared preview lint-rule catalog with passing-condition titles and default
  severities, plus `lint.rules` configuration for changing or disabling existing
  static and on-demand link checks.
- `lintEmail(html, options)` returns findings and the enabled static `rulesRun`;
  `getLintRules()` exposes the effective rule catalog. The existing
  `lintRenderedEmail(html, plainText?)` signature and existing rule defaults are
  preserved; the new static checks are additive.

### Changed

- Props fields retain their types across invalid number drafts and null edits;
  unsupported field shapes use JSON, and reset/variant changes cancel pending edits.
- Nested variant objects preserve unchanged fixture fields, so copied deep-diff
  variants render the same props; arrays and live editor values remain replacements.
- Findings from multiple attributes at the same HTML location remain separate,
  so selecting one issue never expands another card.
- A late variant or watch refresh no longer overwrites props typed while the
  request was in flight.
- `.eml` exports also work on local HTTP domains without secure-context UUIDs.
- Desktop / Mobile preview presets use 600px / 375px; the former Fit preset
  falls back to Desktop. Workspace color follows the OS or the palette's saved
  preference independently of email color. Test sending moves to the top bar.

## 0.2.0 (2026-09-15)

### Added

- `@chakra-email/markdown` for email-safe GFM rendering with customizable
  components, including tables, task lists, and fenced code blocks.
- `@chakra-email/code-block` for themeable email-safe code blocks, optional
  line numbers, and pluggable synchronous syntax highlighting.
- `@chakra-email/react-email` for optional React Email renderer integration
  with Chakra Email tooling; React Email remains an optional peer dependency.
- Component recipes and multipart slot recipes for theme-level customization,
  plus a theme-aware `Font` component.
- Single-pass `renderEmail()` output for HTML and plaintext, with extensible
  renderer adapters.
- Deterministic template exports, compatibility linting, and provider-neutral
  preview test-send transports.
- Focused `/theme` entry points and public declaration-performance regression
  checks.
- Copyable email examples and a reusable Chakra Email composition skill.
- Strict, configurable URL policies with focused `/security` entry points and
  typed, content-free rendering errors.
- Optional UTF-8 output limits and bounded Markdown source, line, AST-node, and
  nesting controls.
- Schema-validated Markdown directives for controlled, non-executable custom
  components.
- Exact reverse-proxy host allowlisting for the local preview server.
- Template-derived preview subjects in the workspace, test sending, and
  deterministic export manifests.
- Opt-in, bounded network link checks in the preview inspector, with explicit
  destination allowlisting and private-network protections.
- Authored light, dark, and system email color modes, including semantic token
  resolution, conditional dark CSS, and Chakra v2/v3 adapter support.

### Changed

- All seven public packages are versioned at `0.2.0`, with internal dependency
  ranges aligned to `^0.2.0` and a synchronized lockfile.
- The docs site uses published Chakra Docs and Postkit 0.2.0 packages with a
  committed lockfile; local yalc links are now an explicit development opt-in.
- React 19 image preload hints are removed from core and React Email adapter
  output.
- Release-blocking dependency advisories were resolved and guarded by the
  existing high-severity audit gate.
- The preview workspace fills the viewport and uses Chakra UI v3 controls,
  accessible icon actions and output tabs, tooltips, collapsible panels, a
  resizable email canvas, and customizable themes and recipes.
- The preview shell and canvas always use dark mode. The header sun/moon
  button controls only the email preview, replacing the footer System/Light/Dark
  selector. Explicit email preferences persist; new or previously saved System
  preferences default to Light. Copy and download output remain unaffected.
- `Img` no longer accepts `srcSet`. Use a single policy-validated `src` instead;
  JavaScript callers supplying `srcSet` receive a content-free
  `INVALID_COMPONENT_PROP` error, even when URL omission is enabled.

### Fixed

- Validate the packed preview CLI against its package version instead of a
  hard-coded release number, including regression coverage for future releases.
- Override Nx's transitive `smol-toml` dependency to 1.7.1 to resolve
  GHSA-7w5x-hrqm-74c2 without downgrading the Nx toolchain.
- Preview hostname validation rejects `127.`-prefixed domains that are not
  loopback IP addresses, preventing them from receiving the preview UI token.
- URL validation preserves valid percent-encoded content such as `%25` while
  continuing to reject malformed encodings and recursively encoded controls.
- Clipboard feedback remains scoped to the active preview output.
- Chakra v2 semantic-token fallback and CodeBlock optional-slot regression
  coverage now meet the existing release thresholds.
- Updated Vitest and its coverage tooling to 4.1.11 to address
  [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).

## 0.1.0 (2026-07-02) - Initial Release

Initial public release candidate.

### Added

- `chakra-email` package for Chakra UI v3-style token objects.
- `@chakra-email/chakra-v2` package for Chakra UI v2-style theme objects.
- `@chakra-email/core` shared primitives, renderer, style system, and theme resolver.
- `@chakra-email/preview` reusable CLI and local browser app for template discovery, live rendering, variants, props, HTML, plain text, source inspection, and rendered-email lint checks.
- Email-safe document, layout, text, media, list, table, code, and blockquote primitives.
- HTML rendering and plain-text rendering helpers.
- Runtime export smoke test for published package entrypoints.
- Documentation, examples, and release-readiness checks.

## Unreleased

### Added

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

- React 19 image preload hints are removed from every core rendering path.
- Release-blocking dependency advisories were resolved and guarded by the
  existing high-severity audit gate.
- The preview workspace fills the viewport and uses Chakra UI v3 controls,
  accessible icon actions and output tabs, tooltips, and theme recipe hooks.
- Email color-mode selection is independent of the preview canvas and follows
  live system preference changes when System is selected.
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

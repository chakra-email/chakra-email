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

### Changed

- React 19 image preload hints are removed from every core rendering path.
- Release-blocking dependency advisories were resolved and guarded by the
  existing high-severity audit gate.

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

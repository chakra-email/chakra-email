# 04 — Acceptance and test plan

> Unit and integration specs run with Vitest through Nx (`npm exec nx -- run-many -t test -p preview preview-ui`).
> Manual checks run against a real project: the Forward templates (22) are the reference set, since the
> mockup was drawn from them.

## 1. Specs to add or update

### `packages/preview`

| Spec                            | Covers                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint-rules.spec.ts` (new)      | Every rule ID used in `lint-email.ts` and `check-links.ts` is registered; titles are non-empty; no duplicate IDs                                                                                                    |
| `lint-email.spec.ts`            | Each new rule fires and doesn't fire (fixtures below); `lint.rules` overrides and `off`; `rulesRun` contents; `selector` matches exactly one element for every element finding; `extractPreviewText` strips padding |
| `client-support.spec.ts` (new)  | Every `knownBreakages` key is a registered rule; every client ID has a display name; findings for mapped rules carry `clients`                                                                                      |
| `config.spec.ts`                | `previewFrom` parsing (name + address, bare address, CR/LF rejected); `lint.rules` validation; `openInEditor` default                                                                                               |
| `discovery.spec.ts`             | `group` from nested and root-level templates; title-casing                                                                                                                                                          |
| `render-template.spec.ts`       | `previewFrom` export (string and function) overrides config; `renderMs` is a non-negative integer                                                                                                                   |
| `http-handler.spec.ts`          | `/api/templates` new fields; `/api/render` new fields; `/api/open` success, unknown ID (404), missing token (401), non-loopback refusal (stub `launch-editor`)                                                      |
| `lint-summary.spec.ts` (new)    | Debounce; cancellation by newer generation; render failure counts as an error; replay to late SSE clients                                                                                                           |
| `check-templates.spec.ts` (new) | Exit codes 0/1/2; `--strict`; `--default-only`; `--rule` precedence over config; JSON shape and ordering; text output snapshot; a throwing template is reported and the run continues                               |
| `cli.spec.ts`                   | `check` argument parsing and help text                                                                                                                                                                              |
| `export-templates.spec.ts`      | Output byte-identical after extracting `renderAllTemplates`                                                                                                                                                         |

**Rule fixtures** (each a minimal rendered HTML string, failing and passing):

- `placeholder-text`: `[Mailing address — owner approval required]` fails; `[1]` (2 chars), a link
  `<a>[docs]</a>`, and brackets inside `<style>` pass; `{{ firstName }}`, `TODO`, `Lorem ipsum` fail.
- `css-border-radius`: `<a style="background:#111;border-radius:999px">` fails; the same with a
  `<!--[if mso]><v:roundrect …>` block passes; `border-radius` on a `td` passes.
- `color-scheme-meta`, `subject-length` (61 chars fails, 60 passes), `preview-text-length` (39 and 151
  fail, 40 and 150 pass), `link-text` ("Click here" fails, "Read the release notes" passes, an
  image link with `alt` passes).

### `apps/preview-ui`

| Spec            | Covers                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.spec.ts`   | Persisted keys and defaults (`01` §6.2); `'fluid'` fallback; debounced props apply (fake timers); parse error keeps last render; Copy as variant output; `.eml` builder (headers, RFC 2047 subject, both parts); `withPreviewHighlight` injects one rule and survives the CSP and color-mode rewrites; selection kept across re-render by key; summary SSE updates row state; tally counts equal tab badge counts |
| `theme.spec.ts` | New tokens exist in both modes; contrast of `success`, `info`, `warning`, `danger` text on `panel` and `chrome` ≥ 4.5:1                                                                                                                                                                                                                                                                                           |

Update existing specs that locate controls by their old position (toolbar, inspector send form,
"Apply" button) rather than deleting their assertions.

## 2. Acceptance checklist

### Shell

- [ ] One top bar; no second toolbar row; no panel-toggle or theme buttons in it.
- [ ] View switch has Preview · Compare · HTML · Text · Source, each with `aria-pressed`.
- [ ] Desktop / Mobile and Light / Dark are icon segmented controls with labels and tooltips.
- [ ] Send test appears only with `testSend` configured and works from the popover (success and error).
- [ ] Export menu: Copy HTML, Copy plain text, Download .html, .txt, .eml.
- [ ] Status bar shows size, clip meter, counts, findings tally, Remote images switch; the reset button
      appears only after dragging the frame.
- [ ] The clip meter turns warning at 80 % and danger at 100 % of 102 KB (test with a padded template).
- [ ] Sidebar footer reads "Watching · rebuilt …", "Connecting…" or "Reconnecting…" (stop the server to check).
- [ ] Workspace follows the OS color mode; the palette can force light or dark, and that persists.

### Sidebar

- [ ] `/` focuses the filter; Esc clears then blurs.
- [ ] Filtering matches names and paths.
- [ ] "With issues" excludes info-only templates and persists.
- [ ] Groups follow folders; a single folder draws no headers.
- [ ] Dots and counts appear within a few seconds of start and update after editing a template.

### Centre column

- [ ] Inbox row shows sender (from config or template), subject and preview text; missing preview text
      reads "No preview text" in warning color.
- [ ] Variant select lists Default plus every variant and re-renders on change.
- [ ] Compare shows three frames (desktop light, mobile light, mobile dark) at true widths, scaled.
- [ ] HTML view has line numbers and highlights the selected finding's line.

### Inspector

- [ ] Tabs are Props · Info · Checks; the app opens on Props the first time and on the last-used tab after.
- [ ] Props: Fields and JSON stay in sync; typing re-renders after 300 ms; invalid JSON keeps the frame.
- [ ] Reset props restores fixture + variant; Copy as variant copies only changed keys.
- [ ] Info: envelope, message stats, source; Open in editor opens the file (hidden with `--allow-remote`).
- [ ] Checks: totals including Passed; cards expand one at a time; selecting outlines the element in
      Preview and Compare; "HTML line N" jumps to the HTML view.
- [ ] Client grid shows the eight clients; a cell with issues filters the list; the reviewed date shows.
- [ ] Links list shows every link; Check links appears only with `linkCheck` configured and fills statuses.
- [ ] Passed disclosure lists rules that ran without findings, by title.
- [ ] Clicking the status-bar tally opens Checks, including when the inspector is collapsed.

### Forward reference run (expected on the sample "Confirm" template)

- [ ] `placeholder-text` warning on the footer's "[Mailing address — owner approval required]", outlined
      in the preview when selected.
- [ ] `css-border-radius` warning on the "Confirm with one click" button, unless the template already
      ships a VML fallback (the Forward email spec calls for one; if it's there, this passes — correct).
- [ ] `document-title` info.
- [ ] Outlook (Windows) cell shows an issue when `css-border-radius` fires.

### Keyboard and accessibility

- [ ] ⌘K / Ctrl K, `/`, `1`–`5`, `d`, `m`, `l`, `[`, `]`, Esc all work and are ignored while typing.
- [ ] Every icon-only button has an accessible name; tab order runs top bar → sidebar → centre → inspector.
- [ ] Severity is readable without color (icons and text).
- [ ] VoiceOver announces template rows with their counts and the tally with its meaning.

### CLI

- [ ] `chakra-email-preview check` on the Forward templates prints the documented layout and exits 1
      only with errors (or warnings with `--strict`).
- [ ] `--format json` validates against the documented shape.
- [ ] The Nx `email-check` target from the docs runs and caches.

## 3. Regression watch

- Test send, copy and download behave exactly as before, from their new places.
- Remote images stay blocked by default in Preview **and** in all three Compare frames.
- The iframe keeps `sandbox=""` and the CSP meta; the highlight rewrite must not add scripts.
- A project `theme` override in `chakra-email.config.ts` still restyles the workspace, including the
  new tokens.
- `export` output is unchanged.

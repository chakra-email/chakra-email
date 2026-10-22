# 03 — Work breakdown

> One ticket per PR, branched from `main`. Conventional commits scoped by project
> (`feat(preview): …`, `feat(preview-ui): …`). "Done" always includes: lint, test and build pass for
> `preview` and `preview-ui` through Nx; new behaviour has specs (`04`); `docs/preview.md` and
> `CHANGELOG.md` updated when documented behaviour changes.

## Dependency graph

```
CEP-01 rule registry ──┬─ CEP-02 new rules + selectors ──┬─ CEP-03 client support data ─┐
                       │                                 │                               │
                       ├─ CEP-04 protocol additions ─────┼─ CEP-05 lint summary (SSE) ───┤
                       │   (group, previewText, from,    │                               │
                       │    renderMs, rulesRun, open)    │                               │
                       └─ CEP-06 check command ──────────┘                               │
                                                                                         │
CEP-07 tokens + shell (top bar, status bar, sidebar footer) ─┬─ CEP-08 sidebar ──────────┤
                                                             ├─ CEP-09 centre column ────┤
                                                             ├─ CEP-10 Props tab ────────┤
                                                             ├─ CEP-11 Info tab ─────────┤
                                                             └─ CEP-12 Checks tab ───────┤
                                                                CEP-13 palette + keys ───┴─ CEP-14 docs + QA
```

Server tickets (01–06) and the UI shell (07) can start in parallel. UI tickets 08–12 need 07 and the
protocol fields they read (04, and 05 for the sidebar dots, 02/03 for Checks).

## Server — `packages/preview`

### CEP-01 — Lint rule registry

**Owns:** new `src/lint-rules.ts`; `lint-email.ts`, `check-links.ts` (rule IDs move out); `config.ts`
(`lint.rules`); `protocol.ts` (`PreviewLintRule`).

- Register every existing rule ID with category, passing-condition title and default severity (`02` §2.1).
- `finding()` resolves severity through the registry and config overrides; rules set to `off` produce nothing.
- Add an internal `lintEmail(html, { text, subject })` returning `{ findings, rulesRun }`. Keep the
  public `lintRenderedEmail(html, plainText?)` signature and return type as a wrapper over it, and
  export `lintEmail` alongside it.
- Validate `lint.rules` keys and levels at config load.
- **Done when:** existing lint specs pass unchanged in expectation; a config override changes a
  finding's severity; `off` removes it; an unknown rule ID fails config load with the documented message.

### CEP-02 — New rules and selectors

**Owns:** `lint-email.ts`, `compatibility.ts`, `lint-rules.ts`.

- Add `placeholder-text`, `css-border-radius`, `color-scheme-meta`, `subject-length`,
  `preview-text-length`, `link-text` (`02` §2.2). `subject-length` reads the subject passed to
  `lintEmail`; through the public `lintRenderedEmail` wrapper it doesn't run.
- Compute `selector` for every element finding (`02` §2.3).
- Extract `extractPreviewText(document)` and reuse it in `preview-text`.
- **Done when:** each rule has passing and failing fixtures; selectors resolve to exactly one element
  with `document.querySelectorAll` in a jsdom spec for every element finding in the fixtures.

### CEP-03 — Client support data

**Owns:** new `src/client-support.ts`; `lint-email.ts` (attach `clients`).

- Implement the client IDs, display names, `clientSupportReviewed` and `knownBreakages` (`02` §3).
- **Verify every seed entry against Can I Email** and drop anything not clearly unsupported. Note the
  check in the PR description.
- **Done when:** findings for mapped rules carry `clients`; the registry-consistency spec passes.

### CEP-04 — Protocol additions and Open in editor

**Owns:** `protocol.ts`, `discovery.ts` (`group`), `render-template.ts` (`renderMs`, `previewFrom`),
`config.ts` (`previewFrom`, `openInEditor`), `http-handler.ts` (`/api/templates` additions,
`/api/open`), `package.json` (`launch-editor`).

- Everything in `02` §1.1, §1.2, §1.4 and §4.
- **Done when:** `/api/templates` returns `group`, `lintRules` and `capabilities.openInEditor`;
  `/api/render` returns `from`, `previewText`, `renderMs`, `rulesRun`; `/api/open` opens a discovered
  template, 404s an unknown ID, returns 401 without the token (as the other `/api/` routes do) and
  refuses on a non-loopback bind.

### CEP-05 — Lint summary over SSE

**Owns:** new `src/lint-summary.ts`; `event-hub.ts` (payloads, replay on connect); `server.ts`
(start the job after discovery and on invalidate).

- `02` §1.3: debounced, cancellable, two at a time, render failures count as one error.
- **Done when:** a connected client receives a summary after start and after a template change; a
  change during a run aborts it and only the newer `generation` is published; a client connecting late
  gets the last summary immediately.

### CEP-06 — `check` command

**Owns:** `cli.ts`, new `src/check-templates.ts`, `export-templates.ts` (extract
`renderAllTemplates`), `index.ts` (export `checkTemplates`).

- Everything in `02` §5.
- **Done when:** exit codes 0 / 1 / 2 behave as documented; `--strict`, `--default-only`, `--rule` and
  `--format json` work; the text output matches the documented layout in a snapshot spec; `export`
  output is byte-identical before and after the refactor.

## UI — `apps/preview-ui`

### CEP-07 — Tokens and shell

**Owns:** `theme.ts` (new tokens, `01` §10; slot recipes for top bar, status bar, segmented control),
`workspace.tsx` (`PreviewWorkspace` layout), `app.ts` (`PreviewTab` gains `'compare'`, `Viewport` loses
`'fluid'`, persisted keys `01` §6.2).

- One top bar (`01` §2) with the view switch, viewport, email color, ⌘K placeholder button, Send test
  popover (moved from the inspector, same state fields) and Export menu.
- Status bar (`01` §4.6) with size + reset, clip meter, counts, findings tally, Remote images switch.
- Sidebar footer status (`01` §3.4).
- Remove everything in `01` §9.
- **Done when:** the workspace matches the mockup's frame at 1440 × 900 in both workspace color modes;
  every removed element is gone; existing send, copy and download specs pass against the new locations;
  a stored `viewport: 'fluid'` falls back to desktop.

### CEP-08 — Sidebar

**Owns:** `TemplateList` in `workspace.tsx`; `app.ts` (filter state, summary state from SSE).

- Filter field with `/`, All · With issues switch, groups from `group`, rows with severity dot and count
  (`01` §3).
- **Done when:** filtering by name and path works; "With issues" excludes info-only templates; one group
  draws no headers; rows' accessible names include the counts.

### CEP-09 — Centre column

**Owns:** `Viewer` in `workspace.tsx`; `app.ts` (`withPreviewHighlight`, `selectedFindingKey`).

- Inbox row with variant select (`01` §4.1); Preview caption; Compare view (`01` §4.3); HTML line gutter
  and selected-line highlight (`01` §4.4); header strips for HTML, Text and Source (`01` §4.5).
- **Done when:** Compare renders three sandboxed frames with the right widths and modes; clicking one
  switches to Preview with its settings; a selected finding outlines its element in Preview and Compare
  and highlights its line in HTML.

### CEP-10 — Props tab

**Owns:** `Inspector` in `workspace.tsx`; `app.ts` (debounced apply, fields model, copy as variant).

- Fields · JSON switch, generated fields, live apply with 300 ms debounce, parse errors keep the last
  good render, Reset props, Copy as variant (`01` §5.1).
- **Done when:** typing in a field re-renders once after 300 ms; invalid JSON shows the error and keeps
  the frame; Copy as variant produces the documented snippet with only changed keys.

### CEP-11 — Info tab and .eml

**Owns:** `Inspector` (Info panel); `app.ts` (`.eml` builder, Open in editor request).

- Envelope, Message and Source lists; Open in editor; Export grid (`01` §5.2, §6.3).
- **Done when:** the `.eml` opens in Apple Mail with subject, both parts and non-ASCII subject intact;
  Open in editor is hidden when the capability is false.

### CEP-12 — Checks tab

**Owns:** `LintPanel` in `workspace.tsx` (rebuilt); `app.ts` (client filter, link rows).

- Totals with Passed, issue cards, client support grid, links list, Passed disclosure, empty state
  (`01` §5.3). The tab badge and the status-bar tally read the same counts.
- **Done when:** selecting a card outlines the element and survives a re-render; "HTML line" opens the
  HTML view at that line; clicking an Outlook (Windows) cell filters to its issues; Passed lists
  `rulesRun` minus fired rules with registry titles.

### CEP-13 — Command palette and keyboard

**Owns:** new `Palette` component in `workspace.tsx`; `app.ts` (global key handling).

- Palette sections and actions (`01` §6.4); shortcuts (`01` §7); workspace theme moves here (D4).
- **Done when:** every shortcut works and none fires while typing in a field; the palette is fully
  keyboard-operable and restores focus on close.

### CEP-14 — Docs and QA pass

**Owns:** `docs/preview.md`, `CHANGELOG.md`, `packages/preview/README.md`.

- Document new config options, template exports, `check`, keyboard shortcuts and the client support note.
- Walk `04` end to end against the Forward templates (22 templates, the sample shown in the mockup).
- **Done when:** every acceptance item in `04` is checked off in the PR description.

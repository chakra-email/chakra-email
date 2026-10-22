# 01 — Workspace UI

> Owner: `apps/preview-ui`. Visual reference: `reference/mockups/Main.dc.html`.
> State lives in `PreviewApplication` / `ApplicationState` (`app.ts`); rendering lives in `workspace.tsx`.

## 1. Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Top bar (§2)                                                                             │
├──────────────┬──────────────────────────────────────────────────────┬────────────────────┤
│ Sidebar (§3) │ Inbox row (§4.1)                                     │ Inspector (§5)     │
│ 248 px       │ ──────────────────────────────────────────────────── │ 340 px             │
│              │ Viewer (§4.2–4.5)                                    │ Props · Info ·     │
│              │                                                      │ Checks             │
│              │ ──────────────────────────────────────────────────── │                    │
│              │ Status bar (§4.6)                                    │                    │
└──────────────┴──────────────────────────────────────────────────────┴────────────────────┘
```

- Sidebar and inspector keep their existing collapse behaviour, now triggered from the ⌘K palette and
  from `[` / `]` (§7). The two panel-toggle buttons in the current app bar are removed.
- Below 1100 px the inspector becomes an overlay sheet from the right, opened by the status-bar tally or
  ⌘K. Below 760 px the sidebar does the same from the left.
- The viewer is the only region that scrolls horizontally.

## 2. Top bar

One row, 52 px, `preview.chrome` background, bottom border `preview.border`. Three groups; the outer two
flex and the middle one stays centred. It wraps rather than overflows.

| Group  | Contents                                                                                                                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Left   | Product mark and "Chakra Email" · `/` · group name (§3.2, omitted with one group) · `/` · template name · the template's `path` in a mono chip (truncates from the left, full path in a tooltip)          |
| Centre | **View switch** (segmented): Preview · Compare · HTML · Text · Source                                                                                                                                     |
| Right  | **Viewport** (icon segmented): Desktop · Mobile. **Email color** (icon segmented): Light · Dark. Divider. **⌘K** button. **Send test** (primary; only when `canTestSend`). **Export** (icon button, menu) |

- View switch maps to `PreviewTab`, extended with `'compare'`. Arrow keys move within a segmented group;
  each button has `aria-pressed`.
- Viewport maps to `Viewport` without `'fluid'` (D11). Email color maps to the existing `EmailColorMode`
  and its storage key `chakra-email.preview.email-color-mode`.
- **Send test** opens a popover anchored to the button: a "Send this render to" email field
  (`sendTo`), a Subject field prefilled from the render (`sendSubject`, with the existing dirty
  tracking), one-line help ("Sends the current props and variant through `testSend` in
  chakra-email.config.ts"), and Send. Success and error messages appear inside the popover
  (`sendMessage`, `sendError`). Esc or an outside click closes it; focus returns to the button.
- **Export** menu: Copy HTML · Copy plain text · Download .html · Download .txt · Download .eml.
  These reuse the existing copy and download helpers; `.eml` is new (§6.3).

## 3. Sidebar

### 3.1 Filter

- A search field ("Filter templates") with a `/` hint. Typing filters by template name and path,
  case-insensitively. `/` focuses it from anywhere outside a text field; Esc clears it, then blurs.
- Under it a two-way switch: **All** (count) · **With issues** (count). "With issues" keeps templates
  whose lint summary (§3.3) has at least one error or warning. Info-only templates don't count.
- Store the filter text in memory only; store the All / With issues choice under
  `chakra-email.preview.template-filter`.

### 3.2 Groups

- Templates are grouped by `group` from `/api/templates` (`02` §1.1): the first folder under the templates
  directory, title-cased. Templates at the root of the directory go in a group with no header, listed first.
- With only one group, no headers are drawn.
- Group header: uppercase 11 px label, `preview.textMuted`, with the count of visible templates.
- Groups and templates sort alphabetically; the server's order already sorts by path.

### 3.3 Template rows

- 32 px rows, full-width buttons, `aria-current="page"` on the selected one.
- When the template's summary has findings, the row ends with a 6 px dot and the count. The dot's color is
  the worst severity: error `preview.danger`, warning `preview.warning`, info `preview.info` (new token,
  §10). Severity is never shown by color alone: the row's accessible name ends with ", 2 warnings".
- Summaries arrive over SSE (`lint-summary`, `02` §1.3) and refresh after each rebuild. Until the first
  summary arrives rows show no dot; don't show a spinner per row.

### 3.4 Footer

One line: a status dot and text derived from `connection` and the time of the last successful render.

| `connection`   | Dot                 | Text                                                                             |
| -------------- | ------------------- | -------------------------------------------------------------------------------- |
| `connected`    | `preview.success`   | "Watching · rebuilt 4s ago" (relative, updates every 10 s; "just now" under 5 s) |
| `connecting`   | `preview.textMuted` | "Connecting…"                                                                    |
| `reconnecting` | `preview.warning`   | "Reconnecting…"                                                                  |

This replaces both the "Live" pill and "Changes refresh automatically".

## 4. Centre column

### 4.1 Inbox row

Shows what a mailbox list would show, above the viewer, at the frame's width (max 640 px, centred).

- Label row: "Inbox preview" (uppercase, muted) on the left; **Variant** select on the right listing
  "Default" plus `result.variants`. Changing it sets `selectedVariant` and re-renders.
- The row itself:
  - Avatar: first letter of the sender name in a 32 px circle.
  - Line 1: sender name (semibold), sender address (muted), and a fixed "9:41 AM" (muted). The sender
    comes from `result.from` (`02` §1.2). Without it, line 1 shows the template name and no address.
  - Line 2: `result.subject`.
  - Line 3: `result.previewText`, muted. Without one, the line reads "No preview text" in
    `preview.warning` (the `preview-text` rule will also report it).
  - Every line truncates with an ellipsis; the full text is in a tooltip.

### 4.2 Preview view

- Caption above the frame, mono 11 px: "600 px · Light client" (or the dragged width, and "Dark client").
- The frame keeps today's iframe, `sandbox=""`, CSP and color-mode rewriting. Add the highlight rewrite
  (§5.3) to the same pipeline: `withPreviewContentSecurityPolicy(withPreviewHighlight(withPreviewColorMode(html, mode), selector), remoteImages)`.
- Drag-to-resize stays on the bottom-right corner. Remove the "680 px preset" label and its tooltip;
  the status bar now shows the size and a reset button (§4.6).

### 4.3 Compare view

Three frames side by side, each in a `figure` with a mono caption:

| Caption               | Width | Color mode | Scale |
| --------------------- | ----- | ---------- | ----- |
| Desktop · Light · 600 | 600   | light      | 0.5   |
| Mobile · Light · 375  | 375   | light      | 0.5   |
| Mobile · Dark · 375   | 375   | dark       | 0.5   |

- Each frame is its own sandboxed iframe with the same rewriting pipeline. Use `transform: scale()` on a
  fixed-size wrapper so layout widths stay true.
- The highlighted selector (§5.3) applies to all three.
- Frames wrap onto a second row when the column is narrower than the three together.
- Clicking a frame switches to Preview with that viewport and color mode.

### 4.4 HTML view

- The existing code view, plus a line-number gutter.
- When a finding with a `line` is selected (§5.3), that line gets a `preview.warningSoft` background,
  a 2 px left mark in the severity color, and is scrolled into view.
- Header strip: "`{slug}.html` · {size}" and Copy HTML.

### 4.5 Text and Source views

Unchanged in content. Each gets the same header strip as HTML: "text/plain · {size}" with Copy text;
"`{path}`" with Copy source.

### 4.6 Status bar

32 px, top border, 12 px text. Left to right:

1. **Size:** "600 × 842" (the frame's current width × the email document's scroll height). After a drag,
   a reset icon button ("Restore 600 px") appears beside it.
2. **Clip meter:** "{html size}" + a 72 px bar + "of 102 KB before Gmail clips". The bar is
   `preview.success` below 80 %, `preview.warning` from 80 % and `preview.danger` from 100 %. 102 KB is
   the threshold the `message-size` rule already uses; export it as one constant and use it in both.
3. **Counts:** "{n} links · {n} images", counted from the rendered HTML (`a[href]`, `img`).
4. **Findings tally** (button): a dot and count per non-zero severity, e.g. "2 warnings · 1 info";
   "No issues" when clean. Clicking it selects the Checks tab and opens the inspector if collapsed.
   Accessible name: "2 warnings, 1 info. Open checks."
5. Right-aligned: **Remote images** switch (moved from the toolbar), off by default as today. Its label
   stays visible; the separate "Remote images blocked" text is removed.

Sizes use bytes of UTF-8 (`TextEncoder`) and format as "18.4 KB" (1 decimal, 1 KB = 1024 bytes).

## 5. Inspector

Tabs: **Props · Info · Checks** (D1). A tablist with arrow-key movement, as the current tabs. The
Checks tab shows a count badge of errors + warnings + info, colored by the worst severity. The selected tab
persists under `chakra-email.preview.inspector-tab`; the default is Props.

### 5.1 Props

- A two-way switch at the top: **Fields** · **JSON**, persisted under `chakra-email.preview.props-mode`.
  On the right, "Reset props" (text button) restores `previewProps` + the selected variant.
- **Fields** lists every leaf of the effective props as a labeled input:
  - Label is the dot path (`values.email`), with the JSON type on the right in mono.
  - Strings → text input; numbers → number input; booleans → switch; `null` → text input that
    writes `null` when emptied. Arrays and objects with more than 20 leaves show "Edit in JSON".
  - Fields write into `propsText` through the same parse-and-validate path as the JSON editor.
- **JSON** is today's editor.
- **Applying:** no Apply button. Edits re-render 300 ms after the last keystroke. While the text doesn't
  parse, keep showing the last good render, show the parse error under the editor (`propsError`), and
  mark the Props tab with a small warning dot.
- Under the fields: "Updates the preview as you type. Your template files aren't changed."
- **Copy as variant** (secondary button): prompts for a name (default "Variant {n}") in a small inline
  field, then copies the props that differ from `previewProps` as an entry to paste into `previewVariants`:
  ```ts
  'Expired code': {
    values: { code: '000 000' },
  },
  ```
  Use single quotes, 2-space indent, and include only changed keys (deep diff). Show "Copied" for 2 s.

### 5.2 Info

Three definition lists, then actions.

| Section  | Rows                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Envelope | From (`result.from`, or "Not set — add `previewFrom`") · To (the Send test address if entered, else "—") · Subject · Preview text |
| Message  | HTML (size) · Plain text (size) · Images · Links · Render (`result.renderMs` ms)                                                  |
| Source   | Template (`path`) · Variant (selected, or "Default")                                                                              |

- **Open in editor** button: `POST /api/open` (`02` §1.4). Hidden when the capability is off.
- **Export** buttons: the same five actions as the top-bar Export menu, as a 2-column grid.

### 5.3 Checks

Top to bottom:

1. **Totals:** three equal tiles — Errors, Warnings, Info — each a count in its severity color, plus a
   fourth tile **Passed** in `preview.success`. Tiles with zero show "0" in `preview.textMuted`.
   Under them: "Ran on render · {renderMs} ms" and a **Re-run** button (re-renders the current state).
2. **Issues:** one card per finding, sorted by severity, then category, then line.
   - Collapsed: severity icon (with an accessible label), `message`, and "{Category} · {ruleId}" in mono.
   - Expanded (click or Enter): `suggestion`; the `element` in mono; "HTML line {line}" as a link that
     switches to the HTML view at that line (D9); and, when present, "Can I Email: {feature}" linking to
     `compatibility.url` (new tab).
   - Selecting a card sets `selectedFindingKey` (`ruleId:line:column`) and, when the finding has a
     `selector`, outlines that element in Preview and Compare: inject
     `{selector}{outline:2px dashed <preview.highlight> !important;outline-offset:3px !important}` into
     the `srcDoc` head with a new `withPreviewHighlight(html, selector)` helper in `app.ts`. Selecting it again clears it. Re-renders keep the selection if a finding with the same
     key still exists.
   - Only one card is expanded at a time.
3. **Client support:** a 2-column grid of the clients in the curated list (`02` §3): Apple Mail,
   iOS Mail, Gmail, Gmail (Android), Outlook.com, Outlook (Windows), Outlook (Mac), Yahoo Mail. Each cell
   shows the client and either "OK" (`preview.success`) or "{n} issue(s)" (`preview.warning`, or
   `preview.danger` when any is an error). A cell with issues is a button that filters the Issues list to
   them; an "All clients" chip clears the filter. A one-line note under the grid: "Known breakages,
   reviewed {date}. Not a rendering test."
4. **Links:** "Links · {n}" with **Check links** on the right (only when `canCheckLinks`; otherwise a
   muted line: "Add `linkCheck.allowedHosts` to check links"). Rows show link text, the href (mono,
   truncated) and a status from the link findings: "not checked", "200", "→ 302", "broken", "skipped".
   Links are matched to findings by line; when several links share a line, by href.
5. **Passed · {n}** (disclosure, closed by default): every rule in `lintRules` (`02` §1.1) that ran and
   produced no finding, with a check icon and the rule's title.

**Empty state:** when there are no findings, the Issues list is replaced by "No issues. {n} checks passed."

## 6. Behaviour details

### 6.1 Rendering pipeline

Unchanged: render on selection, variant change, props change (now debounced) and SSE `invalidate`.
Keep `renderSequence` so stale responses are ignored. During a render keep the previous frame visible
with the existing overlay; don't blank the preview.

### 6.2 Persistence (localStorage, all under `chakra-email.preview.`)

| Key                    | Value                                   |
| ---------------------- | --------------------------------------- |
| `email-color-mode`     | existing                                |
| `workspace-color-mode` | existing; now set only from the palette |
| `inspector-tab`        | `props` · `info` · `checks`             |
| `props-mode`           | `fields` · `json`                       |
| `template-filter`      | `all` · `issues`                        |
| `viewport`             | `desktop` · `mobile`                    |

Wrap every read and write in the existing safe helpers (`app.ts` lines ~138–150).

### 6.3 `.eml` export

Build a minimal RFC 5322 message client-side: `From` (or `preview@localhost`), `To` (or
`preview@localhost`), `Subject` (RFC 2047-encoded when non-ASCII), `Date`, `MIME-Version: 1.0`, and a
`multipart/alternative` body with `text/plain` and `text/html` parts, both quoted-printable. Filename
`{slug}.eml`. This is for opening in a desktop client, not for sending.

### 6.4 Command palette (⌘K / Ctrl K)

A modal list with a search field. Sections: **Templates** (all, with group), **View** (the five views),
**Preview** (Desktop, Mobile, Light client, Dark client, Remote images on/off), **Workspace** (Toggle
sidebar, Toggle inspector, Interface theme: System / Light / Dark), **Actions** (Send test, Check links,
Copy HTML, Download .eml, Open in editor). Arrow keys move, Enter runs, Esc closes and restores focus.
Hide actions whose capability is off.

## 7. Keyboard

| Keys                       | Action                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| ⌘K / Ctrl K                | Command palette                                                             |
| `/`                        | Focus the template filter                                                   |
| ↑ / ↓ in the template list | Move selection (existing roving behaviour)                                  |
| `1`–`5`                    | Preview · Compare · HTML · Text · Source (when focus isn't in a text field) |
| `d` / `m`                  | Desktop / Mobile                                                            |
| `l`                        | Toggle email light/dark                                                     |
| `[` / `]`                  | Toggle sidebar / inspector                                                  |
| Esc                        | Close popover, palette or sheet; clear the selected finding                 |

Single-letter shortcuts are ignored while focus is in an input, textarea, select or the code editor.

## 8. Accessibility

- Every icon-only button has an `aria-label` and a tooltip with the same text plus its shortcut.
- Segmented controls use `aria-pressed`; the inspector uses `role="tablist"` / `tab` / `tabpanel`.
- Severity is conveyed by icon shape and text, not color alone.
- The status-bar tally and the template-row counts are announced with their meaning ("2 warnings").
- Text meets 4.5:1 against its background in both workspace color modes; check the new `info` and
  `success` tokens against `preview.panel` and `preview.chrome`.
- Keep the theme's existing focus styles; don't remove outlines.
- The preview iframe has `title="{template name} preview"`.

## 9. What's removed

- Second toolbar row (its controls move into the top bar and status bar).
- App-bar panel toggles and the workspace theme button (palette, D4).
- "Changes refresh automatically" and the "Live" pill (sidebar footer, §3.4).
- The 680 px preset label and its tooltip (status bar, §4.6).
- Apply props button and its dirty state copy (D5).
- The paragraphs about network link checks being off and links not checked (Checks › Links, §5.3).
- The "Private by default" card. Its content moves to the Remote images switch tooltip: "Scripts and
  forms are disabled. Remote images stay blocked until you turn this on."
- `'fluid'` from `Viewport` (D11).

## 10. Tokens

Everything is styled from `theme.ts` semantic tokens under `preview.*`, so a project's `theme`
override in `chakra-email.config.ts` keeps working. Reuse what exists (`canvas`, `panel`, `raised`,
`soft`, `chrome`, `sidebar`, `border`, `borderStrong`, `text`, `textSubtle`, `textMuted`, `accent`,
`accentInk`, `danger`, `dangerSoft`, `warning`, `warningSoft`, `codeCanvas`, `codeText`, …).

Add these, with light and dark values checked for 4.5:1 text contrast on `preview.panel`:

| Token                 | Light     | Dark      | Use                                                                                                                           |
| --------------------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `preview.success`     | `#1f7a4d` | `#4cc38a` | Passed tile, OK cells, healthy clip meter, watching dot                                                                       |
| `preview.successSoft` | `#e8f5ee` | `#12291d` | Passed list hover                                                                                                             |
| `preview.info`        | `#2f5fb3` | `#8ab4ff` | Info severity                                                                                                                 |
| `preview.infoSoft`    | `#ebf1fb` | `#15213a` | Info card background when selected                                                                                            |
| `preview.highlight`   | `#f5a524` | `#f5a524` | The outline injected into the email for the selected finding (same in both modes: it's drawn on the email, not the workspace) |

Type: keep `fonts.preview` and `fonts.previewMono`. The mockup uses Geist for presentation only; the
font choice isn't part of this update.

Sizes used throughout: top bar 52 px, status bar 32 px, sidebar 248 px, inspector 340 px, rows 32 px,
segmented buttons 28 px tall, radius 8 px on controls and 10 px on cards, 6 px status dots.

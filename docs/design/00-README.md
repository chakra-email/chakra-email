# Chakra Email preview — UI simplification and checks

> Handoff for the redesign of the preview workspace (`apps/preview-ui`) and the server and checks
> work behind it (`packages/preview`) in `chakra-email/chakra-email`.
> Written 2026-10-14 against `main` at `a8a0031` (v0.2.0). Target release: `@chakra-email/preview` 0.3.0.

## What this update does

The preview stays the same tool: discover templates, render them with fixture props, inspect the
output. This update does two things.

1. **Simplifies the workspace.** Two header rows become one top bar. The 680 px preset label, the
   "Remote images blocked" status, the "Live" pill and "Changes refresh automatically" collapse into
   one status bar. Props apply as you type. The inspector becomes three tabs: **Props · Info · Checks**.
2. **Makes validation a first-class tool.** An inbox-row preview of sender, subject and preheader; a
   Checks tab with totals, issues that outline the element in the preview, a client support grid,
   on-demand link checks and the list of passed checks; a Compare view (desktop light, mobile light,
   mobile dark); issue counts per template in the sidebar; and a `chakra-email-preview check` command
   so CI runs the same rules.

## Files

| File | What it covers |
|---|---|
| `00-README.md` | This file: scope, decisions, departures from the mockup, conventions |
| `01-ui-spec.md` | Every region of the workspace, its states, interactions, keyboard and accessibility |
| `02-server-and-protocol.md` | Protocol changes, new endpoints and SSE events, new lint rules, the client support data, the `check` command |
| `03-work-breakdown.md` | Tickets in dependency order, with what each owns and when it's done |
| `04-acceptance-and-test-plan.md` | Acceptance criteria and the specs to add or update |
| `reference/mockups/Main.dc.html` | The interactive mockup (open in the Design canvas, or read as HTML) |
| `reference/mockups/Email.dc.html` | The email used inside the mockup (sample Forward "Confirm" email) |
| `reference/mockups/canvas.json` | Canvas index for the two artboards |

The mockup is the visual reference. Where this spec and the mockup disagree, **this spec wins**; the
known differences are listed below.

## Decisions

| # | Decision | Notes |
|---|---|---|
| D1 | Inspector tabs are **Props · Info · Checks**, opening on Props | Tabs follow the authoring order: set up data, look at details, confirm before sending. Last-used tab is remembered per browser. |
| D2 | Issue totals also live in the **status bar** ("2 warnings · 1 info"), which opens Checks | Problems stay visible while you're in Props. The Checks tab carries a count badge too. |
| D3 | **One top bar** replaces the app bar and the toolbar | Breadcrumb + source path · view switch · viewport · email light/dark · ⌘K · Send test · Export. |
| D4 | The **workspace follows the system color mode**; the explicit UI theme toggle moves into the ⌘K palette | The moon button in the current app bar is removed. The email light/dark switch stays in the top bar because that's a preview setting, not a UI setting. |
| D5 | **Props apply as you type** (debounced), no Apply button | Invalid JSON keeps the last good render and shows the parse error inline. |
| D6 | **"Copy as variant"** replaces "Save as fixture…" | Copies a ready-to-paste `'Name': { … }` entry for `previewVariants`. The preview never writes to source files. |
| D7 | **Client support grid from a curated known-breakage list** | Each compatibility rule names the clients it's known to break in, with a "reviewed" date and the Can I Email link. No support percentages are copied, in keeping with `compatibility.ts`. |
| D8 | **`chakra-email-preview check`** for CI | Lints every template and variant. Errors fail the run; warnings print and pass. `--strict` fails on warnings too. `--format json` for tooling. |
| D9 | Issues point to the **rendered HTML line**, not a TSX source line | Lint runs on rendered HTML, so `footer.tsx:24` in the mockup isn't knowable. The issue shows "HTML line 22", which opens the HTML view at that line. |
| D10 | **Highlight in preview by injected CSS**, not script | The iframe is `sandbox=""` with `script-src 'none'`. The server adds a CSS selector to each finding; the UI injects an outline rule into the `srcDoc`, the same way `withPreviewColorMode` and `withPreviewContentSecurityPolicy` already rewrite it. |
| D11 | **Fluid viewport is retired**; drag-to-resize stays | Desktop (600) and Mobile (375) are the two presets. Dragging the frame corner gives any width; the status bar shows the size and a reset button appears only after a drag. |
| D12 | **Source view stays** in the view switch | The mockup shows Preview · Compare · HTML · Plain text. Shipping keeps Source as a fifth view: Preview · Compare · HTML · Text · Source. |
| D13 | **Send test moves to a top-bar popover** | Uses the existing `testSend` adapter and `/api/send`. The button is hidden when the capability is off, exactly as the inspector form is today. |
| D14 | **Template groups come from folders** | First directory under the templates root. With a single group (all templates in one folder), no group headers are drawn. |

## Departures from the mockup

- **Issue source** reads "HTML line N" instead of a TSX file and line (D9).
- **"Save as fixture…"** is "Copy as variant" (D6); **"Reset to fixture"** is "Reset props".
- **Source view** is kept (D12).
- **Info tab "Category: Transactional"** is dropped. Nothing in the template contract declares a category yet; see Later.
- **Sender in the inbox row** comes from a new optional `previewFrom` (config default, per-template override). Without it the row shows the template name and no address.
- The mockup's sample numbers (18.4 KB, 38 ms, link statuses, `hello@forward.domains`) are illustrative.

## Conventions for this work

- Read `AGENTS.md` first. Run tasks through Nx: `npm exec nx -- run-many -t lint,test,build -p preview preview-ui`.
- Keep the existing split: `apps/preview-ui/src/app.ts` owns state and requests (`PreviewApplication`,
  `ApplicationState`); `workspace.tsx` renders. New UI state goes into `ApplicationState`, not
  component-local state, except purely visual state (popover open, hover).
- Style through `apps/preview-ui/src/theme.ts` semantic tokens and slot recipes so the config `theme`
  override keeps working. No color literals in components.
- Every behaviour change gets a spec next to the existing ones (`app.spec.ts`, `lint-email.spec.ts`,
  `http-handler.spec.ts`, `cli.spec.ts`, …). See `04`.
- Conventional commits scoped by project: `feat(preview): …`, `feat(preview-ui): …`. One ticket per PR.
- Update `docs/preview.md` and `CHANGELOG.md` in the tickets that change documented behaviour.

## Later (not in this update)

- ⌘K palette beyond templates, views and the theme toggle (e.g. recent props, run checks).
- A `previewCategory` export (transactional vs marketing) and rules that depend on it, such as
  requiring `List-Unsubscribe` for marketing mail.
- Mapping rendered-HTML findings back to TSX source lines.
- An Nx plugin that infers `email-preview` and `email-check` targets.

# 02 — Server, protocol, checks and CLI

> Owner: `packages/preview`. Every type change in `protocol.ts` is mirrored in the UI's local types
> in `apps/preview-ui/src/app.ts` (`TemplateSummary`, `RenderResult`, `LintFinding`) and in the
> response validators there.
> All additions are optional or additive, so a 0.3 UI never meets a field it doesn't expect.

## 1. Protocol

### 1.1 `GET /api/templates`

```ts
export interface PreviewTemplate {
  id: string;
  name: string;
  path: string;
  group?: string;            // NEW: first folder under the templates directory, title-cased
}

export interface PreviewLintRule {   // NEW
  id: string;                        // 'placeholder-text'
  category: PreviewLintCategory;
  title: string;                     // 'No placeholder text' — phrased as the passing condition
  severity: PreviewLintSeverity;     // effective severity after config overrides (§4)
}

export interface PreviewTemplatesResponse {
  capabilities: {
    linkCheck?: boolean;
    openInEditor: boolean;           // NEW (§1.4)
    testSend: boolean;
  };
  lintRules: PreviewLintRule[];      // NEW: the full catalog, for the Passed list
  templates: PreviewTemplate[];
}
```

- `group`: compute in `discovery.ts` from the path relative to the templates directory that matched
  it. `account/confirm.email.tsx` → `Account`; `confirm.email.tsx` → no group. Title-case on `-`, `_`
  and spaces (`password-reset` → `Password Reset`).
- `lintRules` is static per process; build it from one registry module (§2.1) so the catalog, the
  linter and the CLI can't drift.

### 1.2 `POST /api/render`

```ts
export interface PreviewLintFinding {
  category: PreviewLintCategory;
  clients?: PreviewClientId[];       // NEW: from the client support list (§3)
  column?: number;
  compatibility?: PreviewCompatibilityReference;
  element?: string;
  line?: number;
  message: string;
  ruleId: string;
  selector?: string;                 // NEW: CSS selector for the element in the rendered HTML (§2.3)
  severity: PreviewLintSeverity;
  suggestion: string;
}

export interface PreviewRenderResponse {
  from?: { address: string; name?: string };  // NEW (§4)
  html: string;
  id: string;
  linkCheck?: { checked: number; skipped: number };
  lint: PreviewLintFinding[];
  name: string;
  previewText?: string;              // NEW: text of the hidden preheader, trimmed, whitespace collapsed
  props: JsonObject;
  renderMs: number;                  // NEW: wall time of render + lint, whole milliseconds
  rulesRun: string[];                // NEW: rule IDs that ran for this render (§2.1)
  source: string;
  subject: string;
  text: string;
  variants: string[];
}
```

- `previewText`: lift the preheader detection out of `lintDocumentMetadata` (the `aria-hidden` +
  `display:none` / `mso-hide:all` `div`) into an exported `extractPreviewText(document)` and use it in
  both places. Strip the `&zwnj;` / `&nbsp;` padding before returning.
- `renderMs`: measure in `render-template.ts` around render and lint with `performance.now()`.
- `rulesRun`: the linter returns it alongside findings. Link rules appear only in `/api/check-links`
  responses, which is how the UI knows links weren't checked yet.
- `/api/check-links` keeps its contract and gains the same new fields.

### 1.3 SSE: `lint-summary`

`EventHub` today sends bare event names (`invalidate`, `templates`). Extend `PreviewEvent` with
`'lint-summary'` and let `publish` carry a JSON `data` payload:

```
event: lint-summary
data: {"generation":7,"templates":[{"id":"account-confirm","error":0,"warning":2,"info":1}]}
```

- A new `lint-summary.ts` runs after discovery and after every `invalidate`: render each template's
  **default** props (no variants), lint, count by severity.
- Run it as a cancellable background job: debounce 500 ms after the last change, two templates at a
  time, abort the in-flight run when a newer change arrives (`generation` increments per run). Don't
  block `/api/render`; an explicit render always wins.
- Publish once per completed run with every template. Keep the last summary in memory and send it to
  newly connected SSE clients right after they connect.
- A template that fails to render counts as one error.

### 1.4 `POST /api/open`

Opens the selected template's source file in the developer's editor.

- Body: `{ "id": "account-confirm" }`. Resolve the path from the discovered templates **only**; never
  accept a path from the request. Unknown IDs → 404.
- Use [`launch-editor`](https://www.npmjs.com/package/launch-editor) (respects `LAUNCH_EDITOR` and
  `EDITOR`). Add it as a dependency of `@chakra-email/preview`.
- Same token check as the other `/api/` routes. Refuse when the server is bound to a non-loopback host
  (`--allow-remote`), since the request could come from another machine.
- Capability `openInEditor` is `config.openInEditor !== false && host is loopback`.
- Response: `204` on success; `{ error: { message } }` with `500` when the editor can't start.

## 2. Lint rules

### 2.1 Rule registry

Create `packages/preview/src/lint-rules.ts` with one entry per rule:

```ts
export interface LintRuleDefinition {
  id: string;
  category: PreviewLintCategory;
  title: string;                 // passing-condition phrasing for the Passed list
  severity: PreviewLintSeverity; // default
}
```

Move every rule ID currently inlined in `lint-email.ts` and `check-links.ts` into it: `valid-html`,
`document-doctype`, `document-body`, `document-language`, `document-title`, `content-type-meta`,
`viewport-meta`, `preview-text`, `image-alt`, `image-dimensions`, `insecure-url`,
`external-stylesheet`, `css-background-image`, `css-display-flex`, `css-display-grid`,
`css-font-face`, `css-position`, the `unsupported-*` element rules, `plain-text-content`,
`message-size`, `link-broken`, `link-redirect`, `link-unverified`, `link-skipped` (check the existing
code for any ID this list misses). `finding()` looks the rule up, applies the configured severity
(§4) and skips rules set to `off`.

### 2.2 New rules

| ID | Category | Default | Fires when | Suggestion |
|---|---|---|---|---|
| `placeholder-text` | content | warning | Visible text or the preheader contains a bracketed placeholder `[Like this]` (3+ chars inside, not a link), `{{ … }}`, `TODO`, `TBD`, `XXX`, or "lorem ipsum" (case-insensitive) | "Replace placeholder text before sending." |
| `css-border-radius` | compatibility | warning | An `a` with a background color and `border-radius`, and the document has no `v:roundrect` VML fallback | "Classic Outlook for Windows ignores border-radius. Add a VML fallback if the shape matters." |
| `color-scheme-meta` | compatibility | info | No `<meta name="color-scheme">` | "Declare `color-scheme` so clients that support dark mode apply your dark styles." |
| `subject-length` | deliverability | info | Subject is over 60 characters | "Many inboxes cut subjects around 40–60 characters. Lead with what matters." |
| `preview-text-length` | deliverability | info | Preview text is under 40 or over 150 characters | "Aim for 40–150 characters so clients don't fill the gap with body text." |
| `link-text` | accessibility | info | An `a[href]` whose accessible text is empty or one of: "click here", "here", "link", "read more", "more" | "Use link text that says where it goes." |

Each new rule gets a `compatibility` reference where one exists (add `css-border-radius` →
`https://www.caniemail.com/features/css-border-radius/` to `compatibility.ts`).

`placeholder-text` must not flag text inside `<style>`, `<head>` or conditional comments, and must
ignore the hidden preheader's padding characters.

### 2.3 Selectors

For every finding with an element, compute a selector from the parse5 tree: tag names joined with
`>` and `:nth-child(n)`, starting at `body` (`body > table:nth-child(2) > tbody:nth-child(1) > …`).
Prefer `#id` when the element or an ancestor has a unique `id`, and start from that. The selector only
has to match the rendered HTML the response carries, so it's stable for the UI's injected outline.

## 3. Client support data

`packages/preview/src/client-support.ts`:

```ts
export type PreviewClientId =
  | 'apple-mail' | 'ios-mail' | 'gmail' | 'gmail-android'
  | 'outlook-com' | 'outlook-windows' | 'outlook-mac' | 'yahoo';

export const previewClients: Readonly<Record<PreviewClientId, string>>; // display names

export const clientSupportReviewed = '2026-10';  // shown in the UI note

export const knownBreakages: Readonly<Record<string /* ruleId */, readonly PreviewClientId[]>>;
```

- A finding's `clients` is `knownBreakages[ruleId]`. Rules not in the map have no `clients` and don't
  affect the grid.
- The grid is **known breakages, not a support matrix**. Keep the list short and deliberate, and link
  every entry to its Can I Email page through the existing `compatibility` reference.
- Seed list — **verify each entry against its Can I Email page before merging**, and drop anything that
  isn't a clear "not supported":

| Rule | Seed clients |
|---|---|
| `css-border-radius` | outlook-windows |
| `css-background-image` | outlook-windows |
| `css-display-flex` | outlook-windows |
| `css-display-grid` | outlook-windows, gmail, gmail-android |
| `css-font-face` | gmail, gmail-android, outlook-windows, yahoo |
| `css-position` | gmail, gmail-android, outlook-windows, yahoo |
| `external-stylesheet` | gmail, gmail-android, outlook-windows, yahoo |
| `unsupported-svg` | gmail, gmail-android, outlook-windows |
| `unsupported-video` | gmail, gmail-android, outlook-com, outlook-windows, yahoo |
| `unsupported-audio` | gmail, gmail-android, outlook-com, outlook-windows, yahoo |
| `unsupported-form` | gmail, gmail-android, outlook-windows |

- Add a spec that fails if any key in `knownBreakages` isn't a registered rule ID, and a comment at the
  top of the file asking for the `clientSupportReviewed` date to be bumped with every edit.

## 4. Config and template contract

```ts
export interface PreviewConfig {
  // existing options …
  /** Default sender shown in the inbox row and .eml export, e.g. 'Forward <hello@forward.domains>'. */
  previewFrom?: string;
  /** Severity overrides for lint rules, used by the preview and the check command. */
  lint?: { rules?: Record<string, 'off' | 'info' | 'warning' | 'error'> };
  /** Set false to hide Open in editor. Defaults to true on loopback hosts. */
  openInEditor?: boolean;
}
```

- Templates may export `previewFrom` (string, or a function of the merged props, like
  `previewSubject`) to override the config default.
- Parse with a small helper: `Name <address>` or a bare address; reject anything with CR/LF. Invalid
  values throw at config load (config) or render (template) with a message naming the option.
- Unknown rule IDs in `lint.rules` throw at config load: "Unknown lint rule 'x' in lint.rules."
- Document all three in `docs/preview.md` (Configuration table and Template Contract).

## 5. `chakra-email-preview check`

Runs the preview's checks over every template without starting a server.

```
chakra-email-preview check [options]

  -c, --config <path>    Configuration file (default: chakra-email.config.ts)
      --default-only     Check default props only; skip previewVariants
      --strict           Exit 1 on warnings as well as errors
      --check-links      Also run network link checks (requires linkCheck in config)
      --format <format>  text (default) or json
      --rule <id=level>  Override a rule's severity; repeatable (off, info, warning, error)
```

**Behaviour**

- Discover templates with the same config. For each template and, unless `--default-only`, each
  variant: render, lint, and (with `--check-links`) check links.
- Share the iteration with `exportTemplates`: extract a `renderAllTemplates(config, { includeVariants })`
  async generator from `export-templates.ts` and use it in both.
- Severity precedence: rule default → `lint.rules` in config → `--rule` flags.
- Exit codes: `0` passed; `1` errors found (or warnings with `--strict`); `2` configuration or render
  failure that stopped the run. A template that throws while rendering is reported as an error finding
  (`render-failed`) and the run continues, so one broken template doesn't hide the rest.

**Text output** (one block per template with findings, then a summary):

```
account/confirm.email.tsx  (default)
  warning  placeholder-text   HTML 22  Replace placeholder text before sending.
  warning  css-border-radius  HTML 18  Classic Outlook for Windows ignores border-radius. …
  info     document-title     HTML 7   Add a title inside Head …

22 templates, 31 renders · 0 errors · 6 warnings · 4 info
```

Colors only when stdout is a TTY and `NO_COLOR` is unset.

**JSON output:** `{ "version": 1, "summary": { templates, renders, error, warning, info },
"results": [ { "template": { id, path }, "variant": string | null, "findings": PreviewLintFinding[] } ] }`.
Sorted by path, then variant, then line.

**Programmatic:** export `checkTemplates(options)` returning the JSON shape, alongside
`exportTemplates`.

**Docs:** add a "Checks in CI" section to `docs/preview.md` with an npm script, a GitHub Actions step,
and an Nx target:

```json
"email-check": {
  "executor": "nx:run-commands",
  "cache": true,
  "inputs": ["{projectRoot}/**/*", "{projectRoot}/chakra-email.config.ts"],
  "options": { "cwd": "packages/emails", "command": "chakra-email-preview check" }
}
```

## 6. Security notes

- `/api/open` only opens discovered template paths, only on loopback, only with the request token.
- The `lint-summary` job renders templates the same way `/api/render` does; it adds no new inputs.
- `check` never sends mail and never opens network connections unless `--check-links` is passed.

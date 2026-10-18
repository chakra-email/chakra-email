import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { PreviewRoot } from './workspace';
import { buildPreviewMessage } from './message';
import { buildVariantSnippet } from './variant';
import { previewClients } from './client-support';
import { parseLintSummary, type TemplateLintCounts } from './lint-summary';

type JsonRecord = Record<string, unknown>;

export type PreviewTab = 'preview' | 'compare' | 'html' | 'text' | 'source';
export type Viewport = 'desktop' | 'mobile';
export type InspectorTab = 'props' | 'info' | 'checks';
export type EmailColorMode = 'light' | 'dark';
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';
export type LintSeverity = 'error' | 'warning' | 'info';
export type LintCategory =
  | 'links'
  | 'accessibility'
  | 'compatibility'
  | 'content'
  | 'deliverability'
  | 'markup';

export type CompatibilityReference = {
  feature: string;
  source: 'Can I Email';
  url: string;
};

export type TemplateSummary = {
  group?: string;
  id: string;
  name: string;
  path?: string;
};

export type RenderResult = {
  from?: { address: string; name?: string };
  previewText?: string;
  rulesRun?: string[];
  renderMs?: number;
  linkCheck?: { checked: number; skipped: number };
  id: string;
  name: string;
  html: string;
  lint: LintFinding[];
  text: string;
  source: string;
  subject: string;
  props: JsonRecord;
  variants: string[];
};

export type LintFinding = {
  clients?: string[];
  category: LintCategory;
  column?: number;
  compatibility?: CompatibilityReference;
  element?: string;
  line?: number;
  message: string;
  ruleId: string;
  selector?: string;
  severity: LintSeverity;
  suggestion: string;
};

export function findingKey(finding: LintFinding): string {
  // Multiple attributes on one element can fire the same rule at one location.
  // Keep their identities distinct without tying selection to severity overrides.
  return JSON.stringify([
    finding.ruleId,
    finding.line ?? null,
    finding.column ?? null,
    finding.selector ?? null,
    finding.message,
  ]);
}

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type EventSourceLike = {
  addEventListener(type: string, listener: (event: Event) => void): void;
  close(): void;
};

type EventSourceFactory = (url: string) => EventSourceLike;

export type PreviewApplicationOptions = {
  root: HTMLElement;
  token: string;
  theme?: JsonRecord;
  fetch?: Fetcher;
  createEventSource?: EventSourceFactory;
  copyText?: (value: string) => Promise<void>;
  downloadText?: (value: string, filename: string, mimeType: string) => void;
};

export type ApplicationState = {
  canOpenInEditor: boolean;
  openingEditor: boolean;
  editorError: string | null;
  selectedClient: string | null;
  selectedFindingKey: string | null;
  lintRules: Array<{ id: string; title: string }>;
  canCheckLinks: boolean;
  checkingLinks: boolean;
  templates: TemplateSummary[];
  selectedId: string | null;
  result: RenderResult | null;
  activeTab: PreviewTab;
  viewport: Viewport;
  emailColorMode: EmailColorMode;
  selectedVariant: string;
  propsText: string;
  appliedProps: JsonRecord | null;
  propsDirty: boolean;
  propsError: string | null;
  variantCopyOpen: boolean;
  variantCopyName: string;
  variantCopyStatus: 'idle' | 'copying' | 'copied';
  variantCopyError: string | null;
  remoteImages: boolean;
  loadingTemplates: boolean;
  rendering: boolean;
  error: string | null;
  connection: ConnectionStatus;
  copied: boolean;
  canTestSend: boolean;
  sendTo: string;
  sendSubject: string;
  sendSubjectDirty: boolean;
  sending: boolean;
  sendError: string | null;
  sendMessage: string | null;
  inspectorTab: InspectorTab;
  propsMode: 'fields' | 'json';
  workspaceColorMode: 'system' | 'light' | 'dark';
  templateFilter: 'all' | 'issues';
  filterText: string;
  templatesOpen: boolean;
  inspectorOpen: boolean;
  paletteOpen: boolean;
  lastRenderedAt: number | null;
  frameWidth: number;
  frameHeight: number | null;
  frameRevision: number;
  templateSummaries: Record<string, TemplateLintCounts>;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatJson(value: JsonRecord): string {
  return JSON.stringify(value, null, 2);
}

function downloadFilename(name: string, extension: string): string {
  const stem = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 80);
  return `${stem || 'email'}.${extension}`;
}

const emailColorModeStorageKey = 'chakra-email.preview.email-color-mode';

function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preview preferences are optional when storage is unavailable.
  }
}

function initialEmailColorMode(): EmailColorMode {
  const stored = readStoredValue(emailColorModeStorageKey);
  // Legacy System preferences now use the predictable light preview default.
  return stored === 'dark' ? 'dark' : 'light';
}

function parseTemplates(value: unknown): {
  canOpenInEditor: boolean;
  lintRules: ApplicationState['lintRules'];
  canCheckLinks: boolean;
  canTestSend: boolean;
  templates: TemplateSummary[];
} {
  const candidates = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value['templates'])
      ? value['templates']
      : null;

  if (!candidates) {
    throw new Error('The preview server returned an invalid template list.');
  }

  const templates = candidates.flatMap((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate['id'] !== 'string' ||
      typeof candidate['name'] !== 'string'
    ) {
      return [];
    }

    const path =
      typeof candidate['path'] === 'string' ? candidate['path'] : undefined;

    return [
      {
        id: candidate['id'],
        name: candidate['name'],
        path,
        group:
          typeof candidate['group'] === 'string'
            ? candidate['group']
            : undefined,
      },
    ];
  });

  const capabilities = isRecord(value) ? value['capabilities'] : undefined;
  const canTestSend =
    isRecord(capabilities) && capabilities['testSend'] === true;

  return {
    lintRules:
      isRecord(value) && Array.isArray(value['lintRules'])
        ? value['lintRules'].flatMap((rule) =>
            isRecord(rule) &&
            typeof rule['id'] === 'string' &&
            typeof rule['title'] === 'string'
              ? [{ id: rule['id'], title: rule['title'] }]
              : [],
          )
        : [],
    canCheckLinks: isRecord(capabilities) && capabilities['linkCheck'] === true,
    canOpenInEditor:
      isRecord(capabilities) && capabilities['openInEditor'] === true,
    canTestSend,
    templates,
  };
}

function parseRenderResult(value: unknown): RenderResult {
  if (
    !isRecord(value) ||
    typeof value['id'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    typeof value['html'] !== 'string' ||
    !Array.isArray(value['lint']) ||
    typeof value['text'] !== 'string' ||
    typeof value['source'] !== 'string' ||
    typeof value['subject'] !== 'string' ||
    !isRecord(value['props']) ||
    !Array.isArray(value['variants']) ||
    !value['variants'].every((variant) => typeof variant === 'string')
  ) {
    throw new Error('The preview server returned an invalid render result.');
  }

  const lint = value['lint'].flatMap((candidate): LintFinding[] => {
    const compatibility = candidateCompatibility(candidate);
    if (
      !isRecord(candidate) ||
      ![
        'accessibility',
        'compatibility',
        'content',
        'deliverability',
        'markup',
        'links',
      ].includes(String(candidate['category'])) ||
      !['error', 'warning', 'info'].includes(String(candidate['severity'])) ||
      typeof candidate['message'] !== 'string' ||
      typeof candidate['ruleId'] !== 'string' ||
      typeof candidate['suggestion'] !== 'string' ||
      (candidate['line'] !== undefined &&
        typeof candidate['line'] !== 'number') ||
      (candidate['column'] !== undefined &&
        typeof candidate['column'] !== 'number') ||
      (candidate['element'] !== undefined &&
        typeof candidate['element'] !== 'string') ||
      (candidate['selector'] !== undefined &&
        typeof candidate['selector'] !== 'string') ||
      (candidate['clients'] !== undefined &&
        (!Array.isArray(candidate['clients']) ||
          !candidate['clients'].every((id) => typeof id === 'string'))) ||
      compatibility === null
    ) {
      return [];
    }

    return [
      {
        category: candidate['category'] as LintCategory,
        clients: candidate['clients'] as string[] | undefined,
        column: candidate['column'] as number | undefined,
        compatibility,
        element: candidate['element'] as string | undefined,
        line: candidate['line'] as number | undefined,
        message: candidate['message'],
        ruleId: candidate['ruleId'],
        selector: candidate['selector'] as string | undefined,
        severity: candidate['severity'] as LintSeverity,
        suggestion: candidate['suggestion'],
      },
    ];
  });

  const from = value['from'];
  if (
    (from !== undefined &&
      (!isRecord(from) ||
        typeof from['address'] !== 'string' ||
        !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/u.test(
          from['address'],
        ) ||
        (from['name'] !== undefined &&
          (typeof from['name'] !== 'string' ||
            /[\r\n]/u.test(from['name']))))) ||
    (value['previewText'] !== undefined &&
      typeof value['previewText'] !== 'string')
  ) {
    throw new Error('The preview server returned invalid envelope metadata.');
  }

  if (lint.length !== value['lint'].length) {
    throw new Error('The preview server returned invalid lint results.');
  }

  const linkCheck = value['linkCheck'];
  if (
    linkCheck !== undefined &&
    (!isRecord(linkCheck) ||
      !Number.isInteger(linkCheck['checked']) ||
      Number(linkCheck['checked']) < 0 ||
      !Number.isInteger(linkCheck['skipped']) ||
      Number(linkCheck['skipped']) < 0)
  ) {
    throw new Error('The preview server returned invalid link-check results.');
  }

  return {
    from:
      from === undefined
        ? undefined
        : {
            address: (from as JsonRecord)['address'] as string,
            name: (from as JsonRecord)['name'] as string | undefined,
          },
    previewText: value['previewText'] as string | undefined,
    rulesRun:
      Array.isArray(value['rulesRun']) &&
      value['rulesRun'].every((id) => typeof id === 'string')
        ? value['rulesRun']
        : undefined,
    renderMs:
      Number.isInteger(value['renderMs']) && Number(value['renderMs']) >= 0
        ? Number(value['renderMs'])
        : undefined,
    linkCheck: linkCheck as RenderResult['linkCheck'],
    id: value['id'],
    name: value['name'],
    html: value['html'],
    lint,
    text: value['text'],
    source: value['source'],
    subject: value['subject'],
    props: value['props'],
    variants: value['variants'],
  };
}

function candidateCompatibility(
  candidate: unknown,
): CompatibilityReference | null | undefined {
  if (!isRecord(candidate) || candidate['compatibility'] === undefined) {
    return undefined;
  }
  const compatibility = candidate['compatibility'];
  if (
    !isRecord(compatibility) ||
    typeof compatibility['feature'] !== 'string' ||
    compatibility['source'] !== 'Can I Email' ||
    typeof compatibility['url'] !== 'string'
  ) {
    return null;
  }
  return compatibility as CompatibilityReference;
}

async function responseError(response: Response): Promise<Error> {
  const text = await response.text();

  if (text) {
    try {
      const payload: unknown = JSON.parse(text);

      if (isRecord(payload) && typeof payload['message'] === 'string') {
        return new Error(payload['message']);
      }

      if (
        isRecord(payload) &&
        isRecord(payload['error']) &&
        typeof payload['error']['message'] === 'string'
      ) {
        return new Error(payload['error']['message']);
      }
    } catch {
      return new Error(text);
    }

    return new Error(text);
  }

  return new Error(`The preview server responded with ${response.status}.`);
}

async function defaultCopyText(value: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Clipboard access is unavailable.');
  }
}

function defaultDownloadText(
  value: string,
  filename: string,
  mimeType: string,
): void {
  const url = URL.createObjectURL(new Blob([value], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Force only Chakra Email's generated rules; delivery output stays untouched. */
export function withPreviewColorMode(
  html: string,
  mode: EmailColorMode | 'system',
): string {
  if (mode === 'system') return html;
  const media = mode === 'dark' ? 'all' : 'not all';
  const output = html.replace(
    /(<style\b[^>]*\bdata-chakra-email-color-mode=["']system["'][^>]*>)([\s\S]*?)(<\/style\s*>)/giu,
    (_match, start: string, css: string, end: string) =>
      `${start}${css.replace(/@media\s*\(prefers-color-scheme:\s*dark\)/giu, `@media ${media}`)}${end}`,
  );
  const style = `<style data-chakra-email-preview-color-mode="${mode}">:root{color-scheme:only ${mode}}</style>`;
  if (/<head\b[^>]*>/iu.test(output))
    return output.replace(/<head\b[^>]*>/iu, (tag) => `${tag}${style}`);
  if (/<html\b[^>]*>/iu.test(output))
    return output.replace(
      /<html\b[^>]*>/iu,
      (tag) => `${tag}<head>${style}</head>`,
    );
  return `${style}${output}`;
}

export function withPreviewContentSecurityPolicy(
  html: string,
  remoteImages: boolean,
  localOrigin = window.location.origin,
): string {
  const imageSources = remoteImages
    ? 'https: http: data: blob:'
    : `${localOrigin} data: blob:`;
  const policy = [
    "default-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    'font-src data:',
    `img-src ${imageSources}`,
    "form-action 'none'",
    "frame-src 'none'",
  ].join('; ');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(policy)}">`;
  const htmlElement = /<html(?:\s[^>]*)?>/i;
  const head = /<head(?:\s[^>]*)?>/i;

  if (head.test(html)) {
    return html.replace(head, (openingTag) => `${openingTag}${meta}`);
  }

  if (htmlElement.test(html)) {
    return html.replace(
      htmlElement,
      (openingTag) => `${openingTag}<head>${meta}</head>`,
    );
  }

  return `<!doctype html><html><head>${meta}</head><body>${html}</body></html>`;
}

/** Resolve an untrusted selector as DOM, never interpolate it into CSS or HTML. */
export function withPreviewHighlight(
  html: string,
  selector?: string,
  highlightColor?: string,
): string {
  if (!selector || selector.length > 4096) return html;
  const document = new DOMParser().parseFromString(html, 'text/html');
  document
    .querySelectorAll('[data-chakra-email-preview-highlight-style]')
    .forEach((element) => element.remove());
  // Resolve against the linter's original element positions, not the extra
  // color-mode style that the preceding preview rewrite prepends to <head>.
  const colorStyles = Array.from(
    document.querySelectorAll('style[data-chakra-email-preview-color-mode]'),
    (element) => ({
      element,
      parent: element.parentNode,
      next: element.nextSibling,
    }),
  );
  colorStyles.forEach(({ element }) => element.remove());
  let matches: NodeListOf<Element>;
  try {
    matches = document.querySelectorAll(selector);
  } catch {
    return html;
  }
  // The linter emits unique selectors. Do not turn an ambiguous selector into a
  // document-wide highlight or accept CSS declarations supplied as selectors.
  if (matches.length !== 1) return html;
  colorStyles
    .reverse()
    .forEach(({ element, parent, next }) =>
      parent?.insertBefore(element, next),
    );
  const attribute = 'data-chakra-email-preview-highlight';
  document.querySelectorAll(`[${attribute}]`).forEach((element) => {
    element.removeAttribute(attribute);
  });
  matches[0]?.setAttribute(attribute, 'selected');
  // Parse as a single color declaration, then reject context-sensitive variables
  // and markup delimiters before serializing into the standalone email document.
  const colorDeclaration = document.createElement('span').style;
  if (highlightColor) colorDeclaration.color = highlightColor;
  const normalizedColor = colorDeclaration.color;
  const color =
    normalizedColor && !/[<>{};@\\]|(?:var|url)\s*\(/iu.test(normalizedColor)
      ? normalizedColor
      : '#f5a524';
  const style = document.createElement('style');
  style.setAttribute('data-chakra-email-preview-highlight-style', '');
  style.textContent = `[${attribute}="selected"]{outline:2px dashed ${color} !important;outline-offset:3px !important}`;
  document.head.append(style);
  const doctype = document.doctype
    ? new XMLSerializer().serializeToString(document.doctype) + '\n'
    : '';
  return doctype + document.documentElement.outerHTML;
}

export class PreviewApplication {
  private readonly root: HTMLElement;
  private readonly token: string;
  private readonly theme: JsonRecord;
  private readonly request: Fetcher;
  private readonly createEventSource: EventSourceFactory;
  private readonly copyText: (value: string) => Promise<void>;
  private readonly downloadText: (
    value: string,
    filename: string,
    mimeType: string,
  ) => void;
  private reactRoot: Root | null = null;
  private eventSource: EventSourceLike | null = null;
  private renderSequence = 0;
  private refreshScheduled = false;
  private summaryGeneration = 0;
  private copyTimer: number | null = null;
  private copySequence = 0;
  private editorSequence = 0;
  private variantCopySequence = 0;
  private variantCopyTimer: number | null = null;
  private started = false;
  private propsTimer: number | null = null;
  private clockTimer: number | null = null;
  private mediaQuery: MediaQueryList | null = null;

  private readonly state: ApplicationState = {
    canOpenInEditor: false,
    openingEditor: false,
    editorError: null,
    selectedClient: null,
    selectedFindingKey: null,
    lintRules: [],
    canCheckLinks: false,
    checkingLinks: false,
    templates: [],
    selectedId: null,
    result: null,
    activeTab: 'preview',
    viewport:
      readStoredValue('chakra-email.preview.viewport') === 'mobile'
        ? 'mobile'
        : 'desktop',
    emailColorMode: initialEmailColorMode(),
    selectedVariant: '',
    propsText: '{}',
    appliedProps: null,
    propsDirty: false,
    propsError: null,
    variantCopyOpen: false,
    variantCopyName: '',
    variantCopyStatus: 'idle',
    variantCopyError: null,
    remoteImages: false,
    loadingTemplates: true,
    rendering: false,
    error: null,
    connection: 'connecting',
    copied: false,
    canTestSend: false,
    sendTo: '',
    sendSubject: '',
    sendSubjectDirty: false,
    sending: false,
    sendError: null,
    sendMessage: null,
    inspectorTab: (['props', 'info', 'checks'].includes(
      readStoredValue('chakra-email.preview.inspector-tab') ?? '',
    )
      ? readStoredValue('chakra-email.preview.inspector-tab')
      : 'props') as InspectorTab,
    propsMode:
      readStoredValue('chakra-email.preview.props-mode') === 'json'
        ? 'json'
        : 'fields',
    workspaceColorMode: (['light', 'dark'].includes(
      readStoredValue('chakra-email.preview.workspace-color-mode') ?? '',
    )
      ? readStoredValue('chakra-email.preview.workspace-color-mode')
      : 'system') as 'system' | 'light' | 'dark',
    templateFilter:
      readStoredValue('chakra-email.preview.template-filter') === 'issues'
        ? 'issues'
        : 'all',
    filterText: '',
    templatesOpen: window.innerWidth >= 760,
    inspectorOpen: window.innerWidth >= 1100,
    paletteOpen: false,
    lastRenderedAt: null,
    frameWidth:
      readStoredValue('chakra-email.preview.viewport') === 'mobile' ? 375 : 600,
    frameHeight: null,
    frameRevision: 0,
    templateSummaries: Object.create(null) as Record<
      string,
      TemplateLintCounts
    >,
  };

  public constructor(options: PreviewApplicationOptions) {
    this.root = options.root;
    this.token = options.token;
    this.theme = options.theme ?? {};
    this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.createEventSource =
      options.createEventSource ??
      ((url) => new EventSource(url) as EventSourceLike);
    this.copyText = options.copyText ?? defaultCopyText;
    this.downloadText = options.downloadText ?? defaultDownloadText;
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemTheme);
    this.clockTimer = window.setInterval(() => this.render(), 10_000);
    this.reactRoot = createRoot(this.root);
    this.render();
    this.connectEvents();
    await this.loadTemplates(false);
  }

  public destroy(): void {
    this.started = false;
    this.resetEditorRequest();
    this.resetVariantCopy(true);
    this.cancelPropsApply();
    if (this.clockTimer !== null) window.clearInterval(this.clockTimer);
    this.mediaQuery?.removeEventListener('change', this.handleSystemTheme);
    this.resetCopyFeedback();
    this.renderSequence += 1;
    this.eventSource?.close();
    this.eventSource = null;

    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  private readonly changeTab = (tab: PreviewTab): void => {
    if (tab !== this.state.activeTab) this.resetCopyFeedback();
    this.state.activeTab = tab;
    this.render();
  };

  private readonly changeViewport = (viewport: Viewport): void => {
    this.state.viewport = viewport;
    storeValue('chakra-email.preview.viewport', viewport);
    this.state.frameWidth = viewport === 'mobile' ? 375 : 600;
    this.state.frameHeight = null;
    this.state.frameRevision += 1;
    this.render();
  };

  private readonly toggleEmailColorMode = (): void => {
    this.state.emailColorMode =
      this.state.emailColorMode === 'dark' ? 'light' : 'dark';
    storeValue(emailColorModeStorageKey, this.state.emailColorMode);
    this.render();
  };

  private readonly changeRemoteImages = (checked: boolean): void => {
    this.state.remoteImages = checked;
    this.render();
  };

  private readonly changeVariant = (variant: string): void => {
    this.resetVariantCopy(true);
    this.cancelPropsApply();
    this.state.selectedVariant = variant;
    this.state.propsDirty = false;
    this.state.propsError = null;
    void this.renderCurrent({ replaceEditor: true });
  };

  private readonly changePropsText = (value: string): void => {
    this.resetVariantCopy();
    this.cancelPropsApply();
    this.state.propsText = value;
    this.state.propsDirty = true;
    this.state.propsError = null;
    this.render();
    this.propsTimer = window.setTimeout(() => {
      this.propsTimer = null;
      void this.applyProps();
    }, 300);
  };

  private cancelPropsApply(): void {
    if (this.propsTimer !== null) window.clearTimeout(this.propsTimer);
    this.propsTimer = null;
  }

  private readonly handleSystemTheme = (): void => {
    this.render();
  };

  private readonly changePreference = (
    key: 'inspectorTab' | 'propsMode' | 'workspaceColorMode' | 'templateFilter',
    value: string,
  ): void => {
    const storage = {
      inspectorTab: 'inspector-tab',
      propsMode: 'props-mode',
      workspaceColorMode: 'workspace-color-mode',
      templateFilter: 'template-filter',
    };
    Object.assign(this.state, { [key]: value });
    storeValue(`chakra-email.preview.${storage[key]}`, value);
    this.render();
  };

  private readonly changeSendTo = (value: string): void => {
    this.state.sendTo = value;
    this.state.sendError = null;
    this.state.sendMessage = null;
    this.render();
  };

  private readonly changeSendSubject = (value: string): void => {
    this.state.sendSubject = value;
    this.state.sendSubjectDirty = true;
    this.state.sendError = null;
    this.state.sendMessage = null;
    this.render();
  };

  private readonly retry = (): void => {
    if (this.state.templates.length === 0) {
      void this.loadTemplates(false);
      return;
    }

    void this.renderCurrent({
      props: this.state.appliedProps ?? undefined,
      replaceEditor: false,
    });
  };

  private readonly dismissError = (): void => {
    this.state.error = null;
    this.render();
  };

  private selectTemplate(templateId: string): void {
    if (templateId === this.state.selectedId) {
      return;
    }

    this.cancelPropsApply();
    this.resetEditorRequest();

    this.state.selectedId = templateId;
    this.state.selectedClient = null;
    this.state.selectedFindingKey = null;
    this.resetVariantCopy(true);
    this.state.result = null;
    this.state.selectedVariant = '';
    this.state.propsText = '{}';
    this.state.appliedProps = null;
    this.state.propsDirty = false;
    this.state.propsError = null;
    this.state.sendError = null;
    this.state.sendMessage = null;
    this.state.sendSubject = '';
    this.state.sendSubjectDirty = false;
    void this.renderCurrent({ replaceEditor: true });
  }

  private async loadTemplates(preserveEditor: boolean): Promise<void> {
    this.resetCopyFeedback();
    const previousId = this.state.selectedId;
    this.state.loadingTemplates = true;
    this.state.error = null;
    this.render();

    try {
      const response = await this.request('/api/templates', {
        headers: {
          accept: 'application/json',
          'x-chakra-email-preview-token': this.token,
        },
      });

      if (!response.ok) {
        throw await responseError(response);
      }

      const parsed = parseTemplates(await response.json());
      const { templates } = parsed;
      this.state.canTestSend = parsed.canTestSend;
      this.state.canOpenInEditor = parsed.canOpenInEditor;
      this.state.lintRules = parsed.lintRules;
      this.state.canCheckLinks = parsed.canCheckLinks;
      this.state.templates = templates;
      this.state.selectedClient = null;
      this.state.loadingTemplates = false;

      if (templates.length === 0) {
        this.resetEditorRequest();
        this.state.selectedFindingKey = null;
        this.state.selectedId = null;
        this.state.result = null;
        this.state.rendering = false;
        this.render();
        return;
      }

      const selectionStillExists = templates.some(
        (template) => template.id === previousId,
      );
      this.state.selectedId = selectionStillExists
        ? previousId
        : (templates[0]?.id ?? null);

      const selectionChanged = this.state.selectedId !== previousId;

      if (selectionChanged) {
        this.resetEditorRequest();
        this.state.selectedFindingKey = null;
        this.state.result = null;
        this.state.selectedVariant = '';
        this.state.propsText = '{}';
        this.state.appliedProps = null;
        this.state.propsDirty = false;
        this.state.propsError = null;
        this.state.sendSubject = '';
        this.state.sendSubjectDirty = false;
      }

      this.render();
      await this.renderCurrent({
        props:
          !selectionChanged && preserveEditor
            ? (this.state.appliedProps ?? undefined)
            : undefined,
        replaceEditor: selectionChanged || !preserveEditor,
      });
    } catch (error) {
      this.state.loadingTemplates = false;
      this.state.error =
        error instanceof Error ? error.message : 'Could not load templates.';
      this.render();
    }
  }

  private async renderCurrent(options: {
    checkLinks?: boolean;
    props?: JsonRecord;
    replaceEditor: boolean;
  }): Promise<void> {
    this.resetVariantCopy();
    this.resetCopyFeedback();
    const id = this.state.selectedId;

    if (!id) {
      return;
    }

    const sequence = ++this.renderSequence;
    const editorAtStart = this.state.propsText;
    const body: {
      id: string;
      variant?: string;
      props?: JsonRecord;
    } = { id };

    if (this.state.selectedVariant) {
      body.variant = this.state.selectedVariant;
    }

    if (options.props !== undefined) {
      body.props = options.props;
    }

    this.state.rendering = true;
    this.state.checkingLinks = Boolean(options.checkLinks);
    this.state.error = null;
    this.render();

    try {
      const response = await this.request(
        options.checkLinks ? '/api/check-links' : '/api/render',
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-chakra-email-preview-token': this.token,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw await responseError(response);
      }

      const result = parseRenderResult(await response.json());

      if (sequence !== this.renderSequence || this.state.selectedId !== id) {
        return;
      }

      if (result.id !== id) {
        throw new Error('The preview server rendered a different template.');
      }

      this.state.result = result;
      if (
        this.state.selectedClient &&
        !result.lint.some((finding) =>
          finding.clients?.includes(this.state.selectedClient ?? ''),
        )
      ) {
        this.state.selectedClient = null;
      }
      if (
        !result.lint.some(
          (finding) => findingKey(finding) === this.state.selectedFindingKey,
        )
      ) {
        this.state.selectedFindingKey = null;
      }
      this.state.lastRenderedAt = Date.now();
      this.state.rendering = false;
      this.state.appliedProps = result.props;
      if (!this.state.sendSubjectDirty) {
        this.state.sendSubject = result.subject;
      }

      if (
        this.state.selectedVariant &&
        !result.variants.includes(this.state.selectedVariant)
      ) {
        this.state.selectedVariant = '';
      }

      if (options.replaceEditor && this.state.propsText === editorAtStart) {
        this.state.propsText = formatJson(result.props);
        this.state.propsDirty = false;
        this.state.propsError = null;
      }

      this.render();
    } catch (error) {
      if (sequence !== this.renderSequence) {
        return;
      }

      this.state.rendering = false;
      this.state.error =
        error instanceof Error ? error.message : 'Could not render the email.';
      this.render();
    }
  }

  private async applyProps(): Promise<void> {
    this.cancelPropsApply();
    const editorText = this.state.propsText;
    const templateId = this.state.selectedId;
    const variant = this.state.selectedVariant;
    let props: unknown;

    try {
      props = JSON.parse(this.state.propsText || '{}');
    } catch {
      this.state.propsError = 'Enter valid JSON before applying props.';
      this.render();
      return;
    }

    if (!isRecord(props)) {
      this.state.propsError = 'Preview props must be a JSON object.';
      this.render();
      return;
    }

    this.state.propsError = null;
    await this.renderCurrent({ props, replaceEditor: false });
    if (
      this.state.propsText === editorText &&
      this.state.selectedId === templateId &&
      this.state.selectedVariant === variant &&
      !this.state.error
    ) {
      this.state.propsDirty = false;
      this.render();
    }
  }

  private async sendTestEmail(): Promise<void> {
    const result = this.state.result;
    const to = this.state.sendTo.trim();

    if (!this.state.canTestSend || !result || this.state.sending) {
      return;
    }
    if (
      this.state.rendering ||
      this.state.propsDirty ||
      this.state.propsError
    ) {
      this.state.sendError =
        'Wait for valid props to finish rendering before sending.';
      this.render();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(to)) {
      this.state.sendError = 'Enter a valid recipient email address.';
      this.state.sendMessage = null;
      this.render();
      return;
    }

    const body: {
      id: string;
      props: JsonRecord;
      subject?: string;
      to: string;
      variant?: string;
    } = {
      id: result.id,
      props: result.props,
      to,
    };
    const subject = this.state.sendSubject.trim();
    if (subject) {
      body.subject = subject;
    }
    if (this.state.selectedVariant) {
      body.variant = this.state.selectedVariant;
    }

    this.state.sending = true;
    this.state.sendError = null;
    this.state.sendMessage = null;
    this.render();

    try {
      const response = await this.request('/api/send', {
        body: JSON.stringify(body),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-chakra-email-preview-token': this.token,
        },
        method: 'POST',
      });
      if (!response.ok) {
        throw await responseError(response);
      }
      const payload: unknown = await response.json();
      if (!isRecord(payload) || typeof payload['message'] !== 'string') {
        throw new Error('The preview server returned an invalid send result.');
      }
      this.state.sendMessage = payload['message'];
    } catch (error) {
      this.state.sendError =
        error instanceof Error ? error.message : 'Could not send the email.';
    } finally {
      this.state.sending = false;
      this.render();
    }
  }

  private resetCopyFeedback(): void {
    this.copySequence += 1;
    this.state.copied = false;
    if (this.copyTimer !== null) {
      window.clearTimeout(this.copyTimer);
      this.copyTimer = null;
    }
  }

  private resetEditorRequest(): void {
    this.editorSequence += 1;
    this.state.openingEditor = false;
    this.state.editorError = null;
  }

  private async openInEditor(): Promise<void> {
    const id = this.state.selectedId;
    if (!id || !this.state.canOpenInEditor || this.state.openingEditor) return;
    this.resetEditorRequest();
    const sequence = this.editorSequence;
    this.state.openingEditor = true;
    this.render();
    try {
      const response = await this.request('/api/open', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-chakra-email-preview-token': this.token,
        },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw await responseError(response);
    } catch (error) {
      if (!this.started || sequence !== this.editorSequence) return;
      this.state.editorError =
        error instanceof Error ? error.message : 'Could not open the editor.';
    } finally {
      if (this.started && sequence === this.editorSequence) {
        this.state.openingEditor = false;
        this.render();
      }
    }
  }

  private async copyAsVariant(name: string): Promise<void> {
    const id = this.state.selectedId;
    const result = this.state.result;
    const propsText = this.state.propsText;
    const variant = this.state.selectedVariant;
    if (
      !id ||
      !result ||
      this.state.rendering ||
      this.state.propsDirty ||
      this.state.propsError
    ) {
      throw new Error(
        'Wait for valid props to finish rendering before copying a variant.',
      );
    }
    // Fetch the fixture rather than the active variant, without replacing the visible render.
    // This also keeps the diff correct if previewProps changed during a watch session.
    const response = await this.request('/api/render', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-chakra-email-preview-token': this.token,
      },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw await responseError(response);
    const baseline = parseRenderResult(await response.json());
    if (
      !this.started ||
      this.state.selectedId !== id ||
      this.state.result !== result ||
      this.state.propsText !== propsText ||
      this.state.selectedVariant !== variant ||
      baseline.id !== id
    ) {
      throw new Error('The preview changed. Copy the variant again.');
    }
    await this.copyText(
      buildVariantSnippet(name, baseline.props, result.props),
    );
  }

  private resetVariantCopy(close = false): void {
    this.variantCopySequence += 1;
    if (this.variantCopyTimer !== null)
      window.clearTimeout(this.variantCopyTimer);
    this.variantCopyTimer = null;
    this.state.variantCopyStatus = 'idle';
    this.state.variantCopyError = null;
    if (close) this.state.variantCopyOpen = false;
  }

  private async copyVariant(): Promise<void> {
    if (!this.state.variantCopyName.trim()) {
      this.state.variantCopyError = 'Enter a name for the variant.';
      this.render();
      return;
    }
    this.resetVariantCopy();
    const sequence = this.variantCopySequence;
    this.state.variantCopyStatus = 'copying';
    this.render();
    try {
      await this.copyAsVariant(this.state.variantCopyName);
      if (!this.started || sequence !== this.variantCopySequence) return;
      this.state.variantCopyStatus = 'copied';
      this.variantCopyTimer = window.setTimeout(() => {
        this.variantCopyTimer = null;
        this.state.variantCopyStatus = 'idle';
        this.render();
      }, 2_000);
    } catch (error) {
      if (!this.started || sequence !== this.variantCopySequence) return;
      this.state.variantCopyStatus = 'idle';
      this.state.variantCopyError =
        error instanceof Error ? error.message : 'Could not copy the variant.';
    }
    this.render();
  }

  private async copyCurrentOutput(
    format = this.state.activeTab,
  ): Promise<void> {
    const result = this.state.result;

    if (!result) {
      return;
    }

    this.resetCopyFeedback();
    const sequence = this.copySequence;
    this.render();

    const value =
      format === 'text'
        ? result.text
        : format === 'source'
          ? result.source
          : result.html;

    try {
      await this.copyText(value);
      if (!this.started || sequence !== this.copySequence) return;
      this.state.copied = true;
      this.render();

      this.copyTimer = window.setTimeout(() => {
        this.copyTimer = null;
        this.state.copied = false;
        this.render();
      }, 1_600);
    } catch (error) {
      if (!this.started || sequence !== this.copySequence) return;
      this.state.error =
        error instanceof Error ? error.message : 'Could not copy the output.';
      this.render();
    }
  }

  private downloadCurrentOutput(format = this.state.activeTab): void {
    const result = this.state.result;
    if (!result) {
      return;
    }

    const output =
      format === 'text'
        ? {
            extension: 'txt',
            mimeType: 'text/plain;charset=utf-8',
            value: result.text,
          }
        : format === 'source'
          ? {
              extension: 'tsx',
              mimeType: 'text/plain;charset=utf-8',
              value: result.source,
            }
          : {
              extension: 'html',
              mimeType: 'text/html;charset=utf-8',
              value: result.html,
            };

    try {
      this.downloadText(
        output.value,
        downloadFilename(result.name, output.extension),
        output.mimeType,
      );
    } catch (error) {
      this.state.error =
        error instanceof Error
          ? error.message
          : 'Could not download the output.';
      this.render();
    }
  }

  private connectEvents(): void {
    try {
      const eventSource = this.createEventSource(
        `/api/events?token=${encodeURIComponent(this.token)}`,
      );
      this.eventSource = eventSource;

      eventSource.addEventListener('open', () => {
        // A restarted server begins its generations at one again. Replay after
        // reconnect establishes the ordering for this connection, not the old process.
        this.summaryGeneration = 0;
        this.state.connection = 'connected';
        this.render();
      });
      eventSource.addEventListener('error', () => {
        this.state.connection = 'reconnecting';
        this.render();
      });
      eventSource.addEventListener('templates', () => {
        this.scheduleRefresh('templates');
      });
      eventSource.addEventListener('lint-summary', (event) => {
        if (
          !this.started ||
          !(event instanceof MessageEvent) ||
          typeof event.data !== 'string'
        )
          return;
        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        const summary = parseLintSummary(payload);
        if (!summary || summary.generation <= this.summaryGeneration) return;
        this.summaryGeneration = summary.generation;
        const counts = Object.create(null) as Record<
          string,
          TemplateLintCounts
        >;
        for (const { id, error, warning, info } of summary.templates)
          counts[id] = { error, warning, info };
        this.state.templateSummaries = counts;
        this.render();
      });
      eventSource.addEventListener('invalidate', (event) => {
        this.handleServerEvent(event, 'render');
      });
      eventSource.addEventListener('change', (event) => {
        this.handleServerEvent(event, 'render');
      });
      eventSource.addEventListener('message', (event) => {
        this.handleServerEvent(event, 'render');
      });
    } catch {
      this.state.connection = 'reconnecting';
      this.render();
    }
  }

  private handleServerEvent(
    event: Event,
    fallback: 'templates' | 'render',
  ): void {
    let refresh = fallback;
    let templateId: string | undefined;

    if (event instanceof MessageEvent && typeof event.data === 'string') {
      try {
        const payload: unknown = JSON.parse(event.data);

        if (isRecord(payload)) {
          const type =
            typeof payload['type'] === 'string' ? payload['type'] : '';
          templateId =
            typeof payload['id'] === 'string' ? payload['id'] : undefined;

          if (
            type.includes('templates') ||
            type.includes('discover') ||
            type.includes('add') ||
            type.includes('remove')
          ) {
            refresh = 'templates';
          }
        }
      } catch {
        if (event.data.includes('template')) {
          refresh = 'templates';
        }
      }
    }

    if (templateId && templateId !== this.state.selectedId) {
      return;
    }

    this.scheduleRefresh(refresh);
  }

  private scheduleRefresh(refresh: 'templates' | 'render'): void {
    if (this.refreshScheduled) {
      return;
    }

    this.refreshScheduled = true;
    queueMicrotask(() => {
      this.refreshScheduled = false;

      if (refresh === 'templates') {
        void this.loadTemplates(true);
      } else {
        void this.renderCurrent({
          props: this.state.appliedProps ?? undefined,
          replaceEditor: false,
        });
      }
    });
  }

  private render(): void {
    if (!this.started || !this.reactRoot) {
      return;
    }

    const state = { ...this.state };
    const workspaceMode =
      state.workspaceColorMode === 'system'
        ? this.mediaQuery?.matches
          ? 'dark'
          : 'light'
        : state.workspaceColorMode;
    document.documentElement.dataset['theme'] = workspaceMode;
    // Chakra v3's semantic tokens and condition styles follow these classes,
    // including portalled components rendered outside the workspace root.
    document.documentElement.classList.toggle('dark', workspaceMode === 'dark');
    document.documentElement.classList.toggle(
      'light',
      workspaceMode === 'light',
    );
    document.documentElement.style.colorScheme = workspaceMode;
    let highlightColor = '#f5a524';
    if (state.selectedFindingKey) {
      const colorProbe = document.createElement('span');
      colorProbe.hidden = true;
      colorProbe.style.color = 'var(--chakra-colors-preview-highlight)';
      this.root.append(colorProbe);
      highlightColor = window.getComputedStyle(colorProbe).color;
      colorProbe.remove();
    }
    const securedHtml = state.result
      ? withPreviewContentSecurityPolicy(
          withPreviewHighlight(
            withPreviewColorMode(state.result.html, state.emailColorMode),
            state.result.lint.find(
              (finding) => findingKey(finding) === state.selectedFindingKey,
            )?.selector,
            highlightColor,
          ),
          state.remoteImages,
        )
      : null;

    flushSync(() => {
      this.reactRoot?.render(
        createElement(PreviewRoot, {
          state,
          securedHtml,
          highlightColor,
          theme: this.theme,
          onClientChange: (client: string | null) => {
            if (client !== null && !Object.hasOwn(previewClients, client))
              return;
            this.state.selectedClient = client;
            if (
              client &&
              !this.state.result?.lint.some(
                (finding) =>
                  findingKey(finding) === this.state.selectedFindingKey &&
                  finding.clients?.includes(client),
              )
            ) {
              this.state.selectedFindingKey = null;
            }
            this.render();
          },
          onSelectFinding: (key: string | null) => {
            this.state.selectedFindingKey =
              key === this.state.selectedFindingKey ? null : key;
            this.render();
          },
          onPreferenceChange: this.changePreference,
          onFilterTextChange: (value: string) => {
            this.state.filterText = value;
            this.render();
          },
          onPanelChange: (
            panel: 'templatesOpen' | 'inspectorOpen' | 'paletteOpen',
            open: boolean,
          ) => {
            this.state[panel] = open;
            this.render();
          },
          onFrameSizeChange: (width: number, height: number) => {
            if (
              width === this.state.frameWidth &&
              height === this.state.frameHeight
            )
              return;
            this.state.frameWidth = width;
            this.state.frameHeight = height;
            this.render();
          },
          onResetFrame: () => this.changeViewport(this.state.viewport),
          onResetProps: () => {
            this.cancelPropsApply();
            void this.renderCurrent({ replaceEditor: true });
          },
          onSelectTemplate: (templateId: string) => {
            this.selectTemplate(templateId);
          },
          onTabChange: this.changeTab,
          onViewportChange: this.changeViewport,
          onToggleEmailColorMode: this.toggleEmailColorMode,
          onRemoteImagesChange: this.changeRemoteImages,
          onVariantChange: this.changeVariant,
          onPropsTextChange: this.changePropsText,
          onCopyVariant: () => {
            void this.copyVariant();
          },
          onVariantCopyOpenChange: (open: boolean) => {
            this.resetVariantCopy();
            if (open)
              this.state.variantCopyName =
                'Variant ' + ((this.state.result?.variants.length ?? 0) + 1);
            this.state.variantCopyOpen = open;
            this.render();
          },
          onVariantCopyNameChange: (name: string) => {
            this.resetVariantCopy();
            this.state.variantCopyName = name;
            this.render();
          },
          onSendToChange: this.changeSendTo,
          onOpenInEditor: () => {
            void this.openInEditor();
          },
          onSendSubjectChange: this.changeSendSubject,
          onCopy: (format?: PreviewTab) => {
            void this.copyCurrentOutput(format);
          },
          onDownload: (format?: PreviewTab | 'eml') => {
            if (format === 'eml' && this.state.result) {
              try {
                this.downloadText(
                  buildPreviewMessage({
                    ...this.state.result,
                    to: this.state.sendTo,
                  }),
                  downloadFilename(this.state.result.name, 'eml'),
                  'message/rfc822',
                );
              } catch (error) {
                this.state.error =
                  error instanceof Error
                    ? error.message
                    : 'Could not export the message.';
                this.render();
              }
            } else if (format !== 'eml') this.downloadCurrentOutput(format);
          },
          onSend: () => {
            void this.sendTestEmail();
          },
          onCheckLinks: () => {
            if (
              !this.state.canCheckLinks ||
              this.state.rendering ||
              !this.state.result
            )
              return;
            void this.renderCurrent({
              checkLinks: true,
              props: this.state.appliedProps ?? undefined,
              replaceEditor: false,
            });
          },
          onRetry: this.retry,
          onDismissError: this.dismissError,
        }),
      );
    });
  }
}

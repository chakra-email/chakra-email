import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { PreviewRoot } from './workspace';

type JsonRecord = Record<string, unknown>;

export type PreviewTab = 'preview' | 'html' | 'text' | 'source';
export type Viewport = 'desktop' | 'mobile' | 'fluid';
export type WorkspaceColorMode = 'light' | 'dark';
export type EmailColorMode = 'system' | WorkspaceColorMode;
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
  id: string;
  name: string;
  path?: string;
};

export type RenderResult = {
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
  category: LintCategory;
  column?: number;
  compatibility?: CompatibilityReference;
  element?: string;
  line?: number;
  message: string;
  ruleId: string;
  severity: LintSeverity;
  suggestion: string;
};

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
  canCheckLinks: boolean;
  checkingLinks: boolean;
  templates: TemplateSummary[];
  selectedId: string | null;
  result: RenderResult | null;
  activeTab: PreviewTab;
  viewport: Viewport;
  workspaceColorMode: WorkspaceColorMode;
  emailColorMode: EmailColorMode;
  selectedVariant: string;
  propsText: string;
  appliedProps: JsonRecord | null;
  propsDirty: boolean;
  propsError: string | null;
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

const workspaceColorModeStorageKey =
  'chakra-email.preview.workspace-color-mode';
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

function initialWorkspaceColorMode(): WorkspaceColorMode {
  const stored = readStoredValue(workspaceColorModeStorageKey);

  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function initialEmailColorMode(): EmailColorMode {
  const stored = readStoredValue(emailColorModeStorageKey);

  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';
}

function parseTemplates(value: unknown): {
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

    return [{ id: candidate['id'], name: candidate['name'], path }];
  });

  const capabilities = isRecord(value) ? value['capabilities'] : undefined;
  const canTestSend =
    isRecord(capabilities) && capabilities['testSend'] === true;

  return {
    canCheckLinks: isRecord(capabilities) && capabilities['linkCheck'] === true,
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
      compatibility === null
    ) {
      return [];
    }

    return [
      {
        category: candidate['category'] as LintCategory,
        column: candidate['column'] as number | undefined,
        compatibility,
        element: candidate['element'] as string | undefined,
        line: candidate['line'] as number | undefined,
        message: candidate['message'],
        ruleId: candidate['ruleId'],
        severity: candidate['severity'] as LintSeverity,
        suggestion: candidate['suggestion'],
      },
    ];
  });

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
  private copyTimer: number | null = null;
  private started = false;

  private readonly state: ApplicationState = {
    canCheckLinks: false,
    checkingLinks: false,
    templates: [],
    selectedId: null,
    result: null,
    activeTab: 'preview',
    viewport: 'desktop',
    workspaceColorMode: initialWorkspaceColorMode(),
    emailColorMode: initialEmailColorMode(),
    selectedVariant: '',
    propsText: '{}',
    appliedProps: null,
    propsDirty: false,
    propsError: null,
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
    this.reactRoot = createRoot(this.root);
    this.render();
    this.connectEvents();
    await this.loadTemplates(false);
  }

  public destroy(): void {
    this.started = false;
    this.renderSequence += 1;
    this.eventSource?.close();
    this.eventSource = null;

    if (this.copyTimer !== null) {
      window.clearTimeout(this.copyTimer);
      this.copyTimer = null;
    }

    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  private readonly changeTab = (tab: PreviewTab): void => {
    this.state.activeTab = tab;
    this.render();
  };

  private readonly changeViewport = (viewport: Viewport): void => {
    this.state.viewport = viewport;
    this.render();
  };

  private readonly toggleWorkspaceColorMode = (): void => {
    this.state.workspaceColorMode =
      this.state.workspaceColorMode === 'dark' ? 'light' : 'dark';
    storeValue(workspaceColorModeStorageKey, this.state.workspaceColorMode);
    this.render();
  };

  private readonly changeEmailColorMode = (
    emailColorMode: EmailColorMode,
  ): void => {
    this.state.emailColorMode = emailColorMode;
    storeValue(emailColorModeStorageKey, emailColorMode);
    this.render();
  };

  private readonly changeRemoteImages = (checked: boolean): void => {
    this.state.remoteImages = checked;
    this.render();
  };

  private readonly changeVariant = (variant: string): void => {
    this.state.selectedVariant = variant;
    this.state.propsDirty = false;
    this.state.propsError = null;
    void this.renderCurrent({ replaceEditor: true });
  };

  private readonly changePropsText = (value: string): void => {
    this.state.propsText = value;
    this.state.propsDirty = true;
    this.state.propsError = null;
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

    this.state.selectedId = templateId;
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
      this.state.canCheckLinks = parsed.canCheckLinks;
      this.state.templates = templates;
      this.state.loadingTemplates = false;

      if (templates.length === 0) {
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
    const id = this.state.selectedId;

    if (!id) {
      return;
    }

    const sequence = ++this.renderSequence;
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

      if (options.replaceEditor) {
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
    await this.renderCurrent({ props, replaceEditor: true });
  }

  private async sendTestEmail(): Promise<void> {
    const result = this.state.result;
    const to = this.state.sendTo.trim();

    if (!this.state.canTestSend || !result || this.state.sending) {
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

  private async copyCurrentOutput(): Promise<void> {
    const result = this.state.result;

    if (!result) {
      return;
    }

    const value =
      this.state.activeTab === 'text'
        ? result.text
        : this.state.activeTab === 'source'
          ? result.source
          : result.html;

    try {
      await this.copyText(value);
      this.state.copied = true;
      this.render();

      if (this.copyTimer !== null) {
        window.clearTimeout(this.copyTimer);
      }

      this.copyTimer = window.setTimeout(() => {
        this.state.copied = false;
        this.render();
      }, 1_600);
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : 'Could not copy the output.';
      this.render();
    }
  }

  private downloadCurrentOutput(): void {
    const result = this.state.result;
    if (!result) {
      return;
    }

    const output =
      this.state.activeTab === 'text'
        ? {
            extension: 'txt',
            mimeType: 'text/plain;charset=utf-8',
            value: result.text,
          }
        : this.state.activeTab === 'source'
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
    document.documentElement.dataset['theme'] = state.workspaceColorMode;
    document.documentElement.style.colorScheme = state.workspaceColorMode;
    const securedHtml = state.result
      ? withPreviewContentSecurityPolicy(state.result.html, state.remoteImages)
      : null;

    flushSync(() => {
      this.reactRoot?.render(
        createElement(PreviewRoot, {
          state,
          securedHtml,
          theme: this.theme,
          onSelectTemplate: (templateId: string) => {
            this.selectTemplate(templateId);
          },
          onTabChange: this.changeTab,
          onViewportChange: this.changeViewport,
          onToggleWorkspaceColorMode: this.toggleWorkspaceColorMode,
          onEmailColorModeChange: this.changeEmailColorMode,
          onRemoteImagesChange: this.changeRemoteImages,
          onVariantChange: this.changeVariant,
          onPropsTextChange: this.changePropsText,
          onSendToChange: this.changeSendTo,
          onSendSubjectChange: this.changeSendSubject,
          onApplyProps: () => {
            void this.applyProps();
          },
          onCopy: () => {
            void this.copyCurrentOutput();
          },
          onDownload: () => {
            this.downloadCurrentOutput();
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

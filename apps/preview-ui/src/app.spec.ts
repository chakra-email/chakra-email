import axe from 'axe-core';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewSlotRecipeKeys } from './theme';
import {
  PreviewApplication,
  withPreviewContentSecurityPolicy,
  withPreviewColorMode,
  withPreviewHighlight,
  type PreviewApplicationOptions,
} from './app';

type RenderRequest = {
  id: string;
  variant?: string;
  props?: Record<string, unknown>;
};

type TestSendRequest = RenderRequest & {
  subject?: string;
  to: string;
};
const applications: PreviewApplication[] = [];

class FakeEventSource extends EventTarget {
  public closed = false;

  public close(): void {
    this.closed = true;
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  const serialized = JSON.stringify(value);

  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
    text: async () => serialized,
  } as Response;
}

function flush(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function getElement<ElementType extends Element>(
  selector: string,
): ElementType {
  if (
    (selector === '[data-action="copy"]' ||
      selector === '[data-action="download"]') &&
    !document.querySelector(selector)
  ) {
    flushSync(() =>
      document
        .querySelector<HTMLButtonElement>('[data-action="export"]')
        ?.click(),
    );
  }
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`Missing test element: ${selector}`);
  }

  return element;
}

async function clickExport(action: 'copy' | 'download') {
  if (!document.querySelector('[data-action="' + action + '"]')) {
    getElement<HTMLButtonElement>('[data-action="export"]').click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-action="' + action + '"]'),
      ).not.toBeNull(),
    );
  }
  getElement<HTMLButtonElement>('[data-action="' + action + '"]').click();
}

// JSDOM does not resolve cascade layers/media queries in getComputedStyle.
// Inspect emitted rules for an element, including nested layers.
function elementDeclarations(element: Element): CSSStyleDeclaration[] {
  const declarations: CSSStyleDeclaration[] = [];
  const selectors = new Set(
    Array.from(element.classList, (name) => `.${name}`),
  );
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (
        'selectorText' in rule &&
        selectors.has((rule as CSSStyleRule).selectorText)
      ) {
        declarations.push((rule as CSSStyleRule).style);
      }
      if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) visit(sheet.cssRules);
  return declarations;
}

function createHarness(
  overrides: Partial<PreviewApplicationOptions> = {},
  fixtureProps: Record<string, unknown> = { name: 'Ada' },
): {
  application: PreviewApplication;
  eventSource: FakeEventSource;
  fetcher: ReturnType<typeof vi.fn>;
  copyText: ReturnType<typeof vi.fn>;
  downloadText: ReturnType<typeof vi.fn>;
  renderRequests: RenderRequest[];
  sendRequests: TestSendRequest[];
  setTemplates: (templates: Array<Record<string, string>>) => void;
} {
  let templates: Array<Record<string, string>> = [
    {
      id: 'welcome',
      name: 'Welcome email',
      path: 'src/welcome.email.tsx',
    },
    {
      id: 'receipt',
      name: 'Order receipt',
      path: 'src/receipt.email.tsx',
    },
  ];
  const renderRequests: RenderRequest[] = [];
  const sendRequests: TestSendRequest[] = [];
  const eventSource = new FakeEventSource();
  const copyText = vi.fn(async () => undefined);
  const downloadText = vi.fn(() => undefined);
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (input === '/api/templates') {
        return jsonResponse({
          capabilities: { testSend: true, linkCheck: true },
          lintRules: [
            { id: 'valid-html', title: 'Valid HTML' },
            { id: 'image-alt', title: 'Images have alternative text' },
            { id: 'viewport-meta', title: 'Viewport metadata is present' },
          ],
          templates,
        });
      }

      if (input === '/api/render' || input === '/api/check-links') {
        const request = JSON.parse(String(init?.body)) as RenderRequest;
        renderRequests.push(request);
        const props =
          request.props ??
          (request.variant === 'reminder'
            ? { days: 3, name: 'Grace' }
            : fixtureProps);

        return jsonResponse({
          ...(input === '/api/check-links'
            ? { linkCheck: { checked: 2, skipped: 1 } }
            : {}),
          id: request.id,
          rulesRun: ['valid-html', 'image-alt', 'viewport-meta'],
          renderMs: 4,
          name: request.id === 'welcome' ? 'Welcome email' : 'Order receipt',
          html: '<!doctype html><html><head><style data-chakra-email-color-mode="system">@media (prefers-color-scheme: dark){.ce-mode-0{color:#fff!important}}</style><style>@media (prefers-color-scheme: dark) { body { background: #111; } } @media (prefers-color-scheme: light) { body { background: #fff; } }</style></head><body><h1>Hello</h1><img src="https://images.example.test/hero.png"></body></html>',
          lint: [
            ...(input === '/api/check-links'
              ? [
                  {
                    category: 'links',
                    element: 'a[href="https://example.org/missing"]',
                    line: 95,
                    message: 'HTTP 404: link appears broken.',
                    ruleId: 'link-broken',
                    severity: 'error',
                    suggestion: 'Verify in a browser with test data.',
                  },
                ]
              : []),
            {
              category: 'accessibility',
              element: '<img>',
              line: 1,
              message: 'This image has no alt attribute.',
              ruleId: 'image-alt',
              selector: 'body > img',
              severity: 'error',
              suggestion: 'Add descriptive alternative text.',
            },
            {
              category: 'compatibility',
              compatibility: {
                feature: 'CSS display:grid',
                source: 'Can I Email',
                url: 'https://www.caniemail.com/features/css-display-grid/',
              },
              message: 'The email is missing a viewport meta tag.',
              ruleId: 'viewport-meta',
              severity: 'warning',
              suggestion: 'Include the Chakra Email Head component.',
            },
          ],
          text: 'Hello from the plain-text email.',
          source: 'export default function WelcomeEmail() { return <Html />; }',
          subject: `Welcome ${String(props['name'] ?? '')}`.trim(),
          props,
          variants: ['reminder', 'long-copy'],
        });
      }

      if (input === '/api/send') {
        const request = JSON.parse(String(init?.body)) as TestSendRequest;
        sendRequests.push(request);
        return jsonResponse({
          id: 'provider-id',
          message: `Test email sent to ${request.to}.`,
        });
      }

      return jsonResponse({ message: 'Not found' }, 404);
    },
  );
  const root = document.querySelector<HTMLElement>('#app');

  if (!root) {
    throw new Error('Missing test root.');
  }

  const application = new PreviewApplication({
    root,
    token: 'preview-token',
    fetch: fetcher,
    createEventSource: vi.fn(() => eventSource),
    copyText,
    downloadText,
    ...overrides,
  });
  applications.push(application);

  return {
    application,
    eventSource,
    fetcher,
    copyText,
    downloadText,
    renderRequests,
    sendRequests,
    setTemplates(nextTemplates) {
      templates = nextTemplates;
    },
  };
}

describe('PreviewApplication', () => {
  it('forces generated dark rules only in preview without rewriting authored media queries', () => {
    const html =
      '<html><head><style data-chakra-email-color-mode="system">@media (prefers-color-scheme: dark){.ce-mode-0{color:#fff!important}}</style><style>@media (prefers-color-scheme: dark){.custom{color:red}}</style></head><body>Preview</body></html>';
    expect(withPreviewColorMode(html, 'system')).toBe(html);
    const dark = withPreviewColorMode(html, 'dark');
    expect(dark).toContain('@media all{.ce-mode-0');
    expect(dark).toContain('@media (prefers-color-scheme: dark){.custom');
    expect(dark).toContain(':root{color-scheme:only dark}');
    expect(withPreviewColorMode(html, 'light')).toContain(
      '@media not all{.ce-mode-0',
    );
    expect(
      withPreviewColorMode('<html><body>Fragment</body></html>', 'light'),
    ).toContain('<head><style');
    expect(withPreviewColorMode('<p>Fragment</p>', 'dark')).toContain(
      'data-chakra-email-preview-color-mode="dark"',
    );
  });
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });
    const storedValues = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => storedValues.clear(),
        getItem: (key: string) => storedValues.get(key) ?? null,
        removeItem: (key: string) => storedValues.delete(key),
        setItem: (key: string, value: string) => {
          storedValues.set(key, value);
        },
      },
    });
    window.localStorage.clear();
    window.localStorage.setItem('chakra-email.preview.props-mode', 'json');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    document.documentElement.lang = 'en';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('light', 'dark', 'host-class');
    document.documentElement.style.removeProperty('color-scheme');
    document.title = 'Chakra Email Preview';
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    for (const application of applications.splice(0)) application.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lets the workspace recipes fill the viewport without Tabs layout defaults', async () => {
    const harness = createHarness();
    await harness.application.start();
    const main = getElement<HTMLElement>('.workspace');
    const declarations = elementDeclarations(main);
    expect(declarations.some((style) => style.display === 'flex')).toBe(true);
    expect(declarations.some((style) => style.flexDirection === 'column')).toBe(
      true,
    );
    expect(declarations.some((style) => style.display === 'block')).toBe(false);
    harness.application.destroy();
  });

  it('applies consumer recipe overrides through the public Chakra recipe hook', async () => {
    const harness = createHarness({
      theme: {
        slotRecipes: {
          [previewSlotRecipeKeys.workspace]: {
            base: { header: { '--preview-override-probe': 'applied' } },
          },
        },
      },
    });
    await harness.application.start();
    expect(
      elementDeclarations(getElement('.topbar')).some(
        (style) =>
          style.getPropertyValue('--preview-override-probe') === 'applied',
      ),
    ).toBe(true);
    harness.application.destroy();
  });

  it('checks links only on demand and clears network findings after a new render', async () => {
    const harness = createHarness();
    await harness.application.start();
    expect(
      harness.fetcher.mock.calls.some(([url]) => url === '/api/check-links'),
    ).toBe(false);
    getElement<HTMLButtonElement>('[data-action="check-links"]').click();
    expect(
      getElement<HTMLButtonElement>('[data-action="check-links"]').disabled,
    ).toBe(true);
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-lint-rule="link-broken"]'),
      ).not.toBeNull(),
    );
    getElement<HTMLButtonElement>(
      '[data-lint-rule="link-broken"] button',
    ).click();
    expect(
      document.querySelector('[data-lint-rule="link-broken"]')?.textContent,
    ).toContain('HTML line 95');
    expect(document.body.textContent).toContain(
      '2 checked (including cached results) · 1 skipped',
    );
    const call = harness.fetcher.mock.calls.find(
      ([url]) => url === '/api/check-links',
    );
    expect(call?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'x-chakra-email-preview-token': 'preview-token' },
    });
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      id: 'welcome',
      props: { name: 'Ada' },
    });
    getElement<HTMLButtonElement>('[data-action="reset-props"]').click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-lint-rule="link-broken"]'),
      ).toBeNull(),
    );
    expect(document.body.textContent).toContain(
      'Links have not been checked for this render.',
    );
    harness.application.destroy();
  });

  it('labels individual links with actual results and clears them on a fresh render', async () => {
    const harness = createHarness();
    const original = harness.fetcher.getMockImplementation();
    if (!original) throw new Error('Missing mock fetch implementation.');
    const html =
      '<body><a href="https://example.org/a">First</a><a href="https://example.org/a">Duplicate</a><a href="https://example.org/go">Redirect</a><a href="https://example.org/gone">Broken</a><a href="">Empty</a><a href="https://example.org/limited">Limited</a></body>';
    harness.fetcher.mockImplementation(async (url, init) => {
      const response = await original(url, init);
      if (url !== '/api/render' && url !== '/api/check-links') return response;
      return jsonResponse({
        ...(await response.json()),
        html,
        ...(url === '/api/check-links'
          ? {
              linkCheck: {
                checked: 4,
                skipped: 1,
                links: [
                  { index: 0, status: 'ok', statusCode: 204 },
                  { index: 1, status: 'ok', statusCode: 204 },
                  { index: 2, status: 'redirect', statusCode: 307 },
                  { index: 3, status: 'broken', statusCode: 410 },
                  { index: 4, status: 'skipped' },
                  { index: 5, status: 'unverified', statusCode: 429 },
                ],
              },
            }
          : {}),
      });
    });
    await harness.application.start();
    const labels = () =>
      Array.from(
        document.querySelectorAll(
          '[data-link-index] [aria-label^="Link status:"]',
        ),
        (el) => el.textContent,
      );
    expect(labels()).toEqual(Array(6).fill('not checked'));
    getElement<HTMLButtonElement>('[data-action="check-links"]').click();
    await vi.waitFor(() =>
      expect(labels()).toEqual([
        '204',
        '204',
        '→ 307',
        'broken',
        'skipped',
        'unverified (429)',
      ]),
    );
    getElement<HTMLButtonElement>('[data-action="reset-props"]').click();
    await vi.waitFor(() =>
      expect(labels()).toEqual(Array(6).fill('not checked')),
    );
  });

  it('rejects malformed per-link metadata and preserves the previous preview', async () => {
    const harness = createHarness();
    await harness.application.start();
    const frame = getElement<HTMLIFrameElement>('#email-preview-frame').srcdoc;
    harness.fetcher.mockResolvedValueOnce(
      jsonResponse({
        id: 'welcome',
        name: 'Welcome',
        html: '<body>Invalid result</body>',
        text: 'Invalid result',
        source: '',
        subject: 'Welcome',
        props: {},
        variants: [],
        lint: [],
        linkCheck: {
          checked: 1,
          skipped: 0,
          links: [{ index: 0, status: 'ok', statusCode: 404 }],
        },
      }),
    );
    getElement<HTMLButtonElement>('[data-action="check-links"]').click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('invalid per-link results'),
    );
    expect(getElement<HTMLIFrameElement>('#email-preview-frame').srcdoc).toBe(
      frame,
    );
  });

  it('hides network actions when the server has not enabled checks', async () => {
    const harness = createHarness();
    const original =
      harness.fetcher.getMockImplementation() as PreviewApplicationOptions['fetch'];
    if (!original) throw new Error('Missing mock fetch implementation.');
    harness.fetcher.mockImplementation(async (url, init) => {
      const response = await original(url, init);
      if (url === '/api/templates')
        return jsonResponse({ ...(await response.json()), capabilities: {} });
      return response;
    });
    await harness.application.start();
    expect(document.querySelector('[data-action="check-links"]')).toBeNull();
    expect(document.body.textContent).toContain('Add linkCheck.allowedHosts');
    harness.application.destroy();
  });

  it('ignores a late link-check response after switching templates', async () => {
    const harness = createHarness();
    const original =
      harness.fetcher.getMockImplementation() as PreviewApplicationOptions['fetch'];
    if (!original) throw new Error('Missing mock fetch implementation.');
    let finish!: (response: Response) => void;
    harness.fetcher.mockImplementation((url, init) =>
      url === '/api/check-links'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : original(url, init),
    );
    await harness.application.start();
    getElement<HTMLButtonElement>('[data-action="check-links"]').click();
    getElement<HTMLButtonElement>('[data-template-id="receipt"]').click();
    await vi.waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toContain(
        'Order receipt',
      ),
    );
    finish(
      await original('/api/check-links', {
        body: JSON.stringify({ id: 'welcome' }),
      }),
    );
    await flush();
    expect(document.querySelector('[data-lint-rule="link-broken"]')).toBeNull();
    expect(document.querySelector('h1')?.textContent).toContain(
      'Order receipt',
    );
    harness.application.destroy();
  });

  it('shows link-check failures and permits retrying', async () => {
    const harness = createHarness();
    await harness.application.start();
    harness.fetcher.mockResolvedValueOnce(
      jsonResponse(
        { error: { message: 'A link check is already running.' } },
        409,
      ),
    );
    getElement<HTMLButtonElement>('[data-action="check-links"]').click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(
        'A link check is already running.',
      ),
    );
    expect(
      getElement<HTMLButtonElement>('[data-action="check-links"]').disabled,
    ).toBe(false);
    getElement<HTMLButtonElement>('[data-action="check-links"]').click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-lint-rule="link-broken"]'),
      ).not.toBeNull(),
    );
    harness.application.destroy();
  });

  it('collapses panels from the palette without losing draft props and restores focus', async () => {
    const harness = createHarness();
    await harness.application.start();
    const editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.value = '{"name":';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    const command = async (label: string) => {
      getElement<HTMLButtonElement>('[data-action="palette"]').click();
      await vi.waitFor(() =>
        expect(
          [...document.querySelectorAll('[role="option"]')].some(
            (b) => b.textContent === label,
          ),
        ).toBe(true),
      );
      [...document.querySelectorAll<HTMLButtonElement>('[role="option"]')]
        .find((b) => b.textContent === label)
        ?.click();
    };
    await command('Toggle inspector');
    expect(getElement<HTMLElement>('#preview-inspector').hidden).toBe(true);
    await command('Toggle inspector');
    expect(getElement<HTMLElement>('#preview-inspector').hidden).toBe(false);
    expect(getElement<HTMLTextAreaElement>('#preview-props').value).toBe(
      '{"name":',
    );
    await command('Toggle sidebar');
    expect(getElement<HTMLElement>('#preview-templates').hidden).toBe(true);
    expect(harness.renderRequests).toHaveLength(1);
    expect(
      document.querySelector('[data-action="toggle-inspector"]'),
    ).toBeNull();
    expect(
      document.querySelector('[data-action="toggle-templates"]'),
    ).toBeNull();
    harness.application.destroy();
  });

  it('restores a resized frame without changing email output or safety', async () => {
    let notify: () => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
        unobserve() {
          return undefined;
        }
      },
    );
    const harness = createHarness();
    await harness.application.start();
    expect(document.querySelector('[data-action="reset-frame"]')).toBeNull();
    const frame = getElement<HTMLElement>('.email-frame-shell');
    frame.style.width = '480px';
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      width: 480,
      height: 842,
    } as DOMRect);
    notify();
    expect(document.querySelector('.preview-statusbar')?.textContent).toContain(
      '480 × 842',
    );
    getElement<HTMLButtonElement>('[data-action="reset-frame"]').click();
    expect(getElement('.email-frame-shell')).not.toBe(frame);
    expect(getElement<HTMLElement>('.email-frame-shell').style.width).not.toBe(
      '480px',
    );
    expect(getElement('#email-preview-frame').getAttribute('sandbox')).toBe('');
    expect(harness.renderRequests).toHaveLength(1);
    harness.application.destroy();
  });

  it('starts with an unobstructed canvas on small screens and opens accessible overlay panels', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    });
    const harness = createHarness();
    await harness.application.start();
    expect(
      document.querySelector('[role="dialog"][data-state="open"]'),
    ).toBeNull();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: '[', bubbles: true }),
    );
    await vi.waitFor(() =>
      expect(
        document.querySelector('[role="dialog"][data-state="open"]')
          ?.textContent,
      ).toContain('Email templates'),
    );
    getElement<HTMLButtonElement>('[data-template-id="receipt"]').click();
    await vi.waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toContain(
        'Order receipt',
      ),
    );
    expect(
      document.querySelector('[role="dialog"][data-state="open"]'),
    ).toBeNull();
    getElement<HTMLButtonElement>('[data-action="open-checks"]').click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[role="dialog"][data-state="open"]')
          ?.textContent,
      ).toContain('Preview settings'),
    );
    expect(
      document
        .querySelector('[data-inspector-tab="checks"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    harness.application.destroy();
  });

  it('loads templates with authentication and renders the first email safely', async () => {
    const harness = createHarness();

    await harness.application.start();

    expect(
      document.querySelectorAll<HTMLButtonElement>('[data-template-id]'),
    ).toHaveLength(2);
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-template-id="welcome"]')
        ?.getAttribute('aria-current'),
    ).toBe('page');
    expect(document.querySelector('h1')?.textContent).toContain(
      'Welcome email',
    );
    expect(document.querySelector('.preview-surface')?.textContent).toContain(
      'Welcome Ada',
    );
    expect(harness.fetcher).toHaveBeenNthCalledWith(1, '/api/templates', {
      headers: {
        accept: 'application/json',
        'x-chakra-email-preview-token': 'preview-token',
      },
    });

    const renderCall = harness.fetcher.mock.calls[1];
    expect(renderCall?.[0]).toBe('/api/render');
    expect(renderCall?.[1]).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-chakra-email-preview-token': 'preview-token',
      },
    });
    expect(JSON.parse(String(renderCall?.[1]?.body))).toEqual({
      id: 'welcome',
    });

    const iframe = document.querySelector<HTMLIFrameElement>(
      '#email-preview-frame',
    );
    expect(iframe?.getAttribute('sandbox')).toBe('');
    expect(iframe?.srcdoc).toContain("script-src 'none'");
    expect(iframe?.srcdoc).toContain(
      `img-src ${window.location.origin} data: blob:`,
    );
    expect(iframe?.srcdoc).not.toContain('img-src https:');

    harness.application.destroy();
    expect(harness.eventSource.closed).toBe(true);
  });

  it('selects variants and validates debounced JSON props without discarding the last good render', async () => {
    const harness = createHarness();
    await harness.application.start();
    const variant = getElement<HTMLSelectElement>('#variant');
    variant.value = 'reminder';
    variant.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() =>
      expect(getElement<HTMLTextAreaElement>('#preview-props').value).toContain(
        'Grace',
      ),
    );
    expect(harness.renderRequests.at(-1)).toEqual({
      id: 'welcome',
      variant: 'reminder',
    });
    const iframe = getElement<HTMLIFrameElement>('#email-preview-frame');
    const lastGood = iframe.srcdoc;
    vi.useFakeTimers();
    const edit = (value: string) => {
      const editor = getElement<HTMLTextAreaElement>('#preview-props');
      editor.value = value;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };
    edit('["not", "an", "object"]');
    await vi.advanceTimersByTimeAsync(300);
    expect(document.querySelector('#props-error')?.textContent).toContain(
      'must be a JSON object',
    );
    expect(harness.renderRequests).toHaveLength(2);
    expect(iframe.srcdoc).toBe(lastGood);
    edit('{"name":');
    await vi.advanceTimersByTimeAsync(300);
    expect(document.querySelector('#props-error')?.textContent).toContain(
      'Enter valid JSON',
    );
    expect(iframe.srcdoc).toBe(lastGood);
    edit('{"name":"Li"}');
    await vi.advanceTimersByTimeAsync(200);
    edit('{"name":"Lin","plan":"Pro"}');
    await vi.advanceTimersByTimeAsync(299);
    expect(harness.renderRequests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.renderRequests.at(-1)).toEqual({
      id: 'welcome',
      variant: 'reminder',
      props: { name: 'Lin', plan: 'Pro' },
    });
    expect(document.querySelector('.unsaved')).toBeNull();
    expect(document.querySelector('[data-action="apply-props"]')).toBeNull();
    vi.useRealTimers();
    harness.application.destroy();
  });

  it('surfaces rendered-email lint findings with severity and guidance', async () => {
    const harness = createHarness();
    await harness.application.start();

    expect(
      document.querySelector('[data-lint-rule="image-alt"]')?.textContent,
    ).not.toContain('Add descriptive alternative text');
    getElement<HTMLButtonElement>(
      '[data-lint-rule="image-alt"] button',
    ).click();
    expect(
      document.querySelector('.lint-summary')?.getAttribute('aria-label'),
    ).toContain('1 error, 1 warning');
    expect(
      document
        .querySelector('[data-lint-rule="image-alt"]')
        ?.getAttribute('data-severity'),
    ).toBe('error');
    expect(
      document.querySelector('[data-lint-rule="image-alt"]')?.textContent,
    ).toContain('Add descriptive alternative text');
    expect(document.querySelector('.lint-panel')?.textContent).toContain(
      'HTML line 1',
    );
    getElement<HTMLButtonElement>(
      '[data-lint-rule="viewport-meta"] button',
    ).click();
    expect(
      document
        .querySelector('[data-lint-rule="image-alt"] button')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');
    expect(
      document.querySelector<HTMLAnchorElement>(
        '.lint-panel a[target="_blank"]',
      )?.href,
    ).toBe('https://www.caniemail.com/features/css-display-grid/');

    harness.application.destroy();
  });

  it('selects one finding, outlines protected preview and compare frames, and jumps to its HTML line', async () => {
    const harness = createHarness();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    await harness.application.start();
    const card = getElement<HTMLButtonElement>(
      '[data-lint-rule="image-alt"] button',
    );
    expect(card.tagName).toBe('BUTTON');
    expect(card.getAttribute('aria-expanded')).toBe('false');
    card.focus();
    card.click();
    expect(card.getAttribute('aria-expanded')).toBe('true');
    const preview = getElement<HTMLIFrameElement>('#email-preview-frame');
    expect(preview.srcdoc).toContain(
      'data-chakra-email-preview-highlight="selected"',
    );
    expect(preview.srcdoc).toContain('outline:2px dashed #f5a524');
    expect(preview.getAttribute('sandbox')).toBe('');
    expect(preview.srcdoc).toContain("script-src 'none'");
    card.click();
    expect(card.getAttribute('aria-expanded')).toBe('false');
    expect(preview.srcdoc).not.toContain(
      'data-chakra-email-preview-highlight="selected"',
    );
    card.click();
    getElement<HTMLButtonElement>('[data-tab="compare"]').click();
    document
      .querySelectorAll<HTMLIFrameElement>('.compare-frames iframe')
      .forEach((frame) => {
        expect(frame.srcdoc).toContain(
          'data-chakra-email-preview-highlight="selected"',
        );
        expect(frame.getAttribute('sandbox')).toBe('');
        expect(frame.srcdoc).toContain("script-src 'none'");
        expect(frame.srcdoc).not.toContain('img-src https:');
      });
    getElement<HTMLAnchorElement>('[data-lint-rule="image-alt"] a').click();
    expect(getElement<HTMLElement>('.code-view').dataset['language']).toBe(
      'html',
    );
    expect(
      getElement<HTMLElement>('#html-line-1').dataset['selectedFinding'],
    ).toBe('error');
    await vi.waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: 'center',
        inline: 'nearest',
      }),
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('[data-selected-finding]')).toBeNull();
    expect(card.getAttribute('aria-expanded')).toBe('false');
    delete (HTMLElement.prototype as { scrollIntoView?: unknown })
      .scrollIntoView;
  });

  it('selects only one same-rule finding when multiple attributes share a source location', async () => {
    const harness = createHarness();
    const original = harness.fetcher.getMockImplementation() as NonNullable<
      PreviewApplicationOptions['fetch']
    >;
    harness.fetcher.mockImplementation(async (url, init) => {
      const response = await original(url, init);
      if (url !== '/api/render') return response;
      const common = {
        category: 'compatibility',
        ruleId: 'insecure-url',
        line: 1,
        column: 1,
        selector: 'body > a',
        element: '<a>',
        severity: 'warning',
        suggestion: 'Use HTTPS.',
      };
      return jsonResponse({
        ...(await response.json()),
        html: '<body><a href="http://example.com" background="http://example.com/bg.png">Link</a></body>',
        lint: [
          { ...common, message: 'The href URL uses insecure HTTP.' },
          { ...common, message: 'The background URL uses insecure HTTP.' },
        ],
      });
    });
    await harness.application.start();
    const cards = () => [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-action="select-finding"]',
      ),
    ];
    expect(cards()).toHaveLength(2);
    cards()[0]?.click();
    expect(cards().map((card) => card.getAttribute('aria-expanded'))).toEqual([
      'true',
      'false',
    ]);
    cards()[1]?.click();
    expect(cards().map((card) => card.getAttribute('aria-expanded'))).toEqual([
      'false',
      'true',
    ]);
    harness.eventSource.dispatchEvent(new Event('invalidate'));
    await vi.waitFor(() => expect(harness.renderRequests).toHaveLength(2));
    await vi.waitFor(() =>
      expect(
        getElement<HTMLButtonElement>('[data-action="copy-variant"]').disabled,
      ).toBe(false),
    );
    expect(cards().map((card) => card.getAttribute('aria-expanded'))).toEqual([
      'false',
      'true',
    ]);
  });

  it('keeps a finding selected by key after a rerender and clears it when removed or changing templates', async () => {
    const harness = createHarness();
    let includeImage = true;
    const fetcher = harness.fetcher.getMockImplementation() as NonNullable<
      PreviewApplicationOptions['fetch']
    >;
    harness.fetcher.mockImplementation(async (input, init) => {
      const response = await fetcher(input, init);
      if (input !== '/api/render') return response;
      const payload = await response.json();
      return jsonResponse({
        ...payload,
        lint: includeImage
          ? payload.lint
          : payload.lint.filter(
              (finding: { ruleId: string }) => finding.ruleId !== 'image-alt',
            ),
      });
    });
    await harness.application.start();
    getElement<HTMLButtonElement>(
      '[data-lint-rule="image-alt"] button',
    ).click();
    getElement<HTMLButtonElement>('[data-inspector-tab="checks"]').click();
    const rerun = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Re-run',
    );
    if (!rerun) throw new Error('Missing Re-run button');
    rerun.click();
    await vi.waitFor(() => expect(harness.renderRequests).toHaveLength(2));
    await vi.waitFor(() => expect(rerun.disabled).toBe(false));
    await vi.waitFor(() =>
      expect(
        getElement<HTMLButtonElement>(
          '[data-lint-rule="image-alt"] button',
        ).getAttribute('aria-expanded'),
      ).toBe('true'),
    );
    includeImage = false;
    rerun.click();
    await vi.waitFor(() =>
      expect(document.querySelector('[data-lint-rule="image-alt"]')).toBeNull(),
    );
    await vi.waitFor(() => expect(rerun.disabled).toBe(false));
    expect(
      getElement<HTMLIFrameElement>('#email-preview-frame').srcdoc,
    ).not.toContain('data-chakra-email-preview-highlight="selected"');
    includeImage = true;
    rerun.click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-lint-rule="image-alt"]'),
      ).not.toBeNull(),
    );
    expect(
      getElement<HTMLButtonElement>(
        '[data-lint-rule="image-alt"] button',
      ).getAttribute('aria-expanded'),
    ).toBe('false');
    getElement<HTMLButtonElement>(
      '[data-lint-rule="image-alt"] button',
    ).click();
    getElement<HTMLButtonElement>('[data-template-id="receipt"]').click();
    await vi.waitFor(() =>
      expect(harness.renderRequests.at(-1)?.id).toBe('receipt'),
    );
    await vi.waitFor(() =>
      expect(
        getElement<HTMLButtonElement>(
          '[data-lint-rule="image-alt"] button',
        ).getAttribute('aria-expanded'),
      ).toBe('false'),
    );
  });

  it('filters reviewed client breakages without inferring mappings for unmapped findings', async () => {
    const harness = createHarness();
    let includeMappedIssue = true;
    const fetcher = harness.fetcher.getMockImplementation() as NonNullable<
      PreviewApplicationOptions['fetch']
    >;
    harness.fetcher.mockImplementation(async (input, init) => {
      const response = await fetcher(input, init);
      if (input !== '/api/render') return response;
      const payload = await response.json();
      return jsonResponse({
        ...payload,
        lint: [
          ...payload.lint,
          ...(includeMappedIssue
            ? [
                {
                  category: 'compatibility',
                  severity: 'warning',
                  ruleId: 'css-border-radius',
                  clients: ['outlook-windows'],
                  message: 'Rounded button needs a fallback.',
                  suggestion: 'Add VML.',
                  selector: 'h1',
                },
              ]
            : []),
        ],
      });
    });
    await harness.application.start();
    expect(document.querySelectorAll('[data-client]')).toHaveLength(8);
    expect(
      getElement<HTMLElement>('[data-client="gmail"]').textContent,
    ).toContain('No known issues');
    expect(getElement<HTMLElement>('[data-client="gmail"]').tagName).not.toBe(
      'BUTTON',
    );
    getElement<HTMLButtonElement>('[data-client="outlook-windows"]').click();
    expect(document.querySelectorAll('.lint-finding')).toHaveLength(1);
    expect(
      document.querySelector('[data-lint-rule="css-border-radius"]'),
    ).not.toBeNull();
    expect(
      getElement<HTMLButtonElement>(
        '[data-client="outlook-windows"]',
      ).getAttribute('aria-pressed'),
    ).toBe('true');
    const clear = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'All clients',
    );
    if (!clear) throw new Error('Missing All clients button');
    clear.click();
    await vi.waitFor(() =>
      expect(document.querySelectorAll('.lint-finding')).toHaveLength(3),
    );
    expect(document.querySelector('.lint-panel')?.textContent).toContain(
      'Known breakages, reviewed 2026-10. Not a rendering test.',
    );
    getElement<HTMLButtonElement>('[data-client="outlook-windows"]').click();
    harness.eventSource.dispatchEvent(new Event('templates'));
    await vi.waitFor(() => expect(harness.renderRequests).toHaveLength(2));
    await vi.waitFor(() =>
      expect(document.querySelectorAll('.lint-finding')).toHaveLength(3),
    );
    expect(
      getElement<HTMLButtonElement>(
        '[data-client="outlook-windows"]',
      ).getAttribute('aria-pressed'),
    ).toBe('false');
    getElement<HTMLButtonElement>('[data-client="outlook-windows"]').click();
    includeMappedIssue = false;
    harness.eventSource.dispatchEvent(new Event('invalidate'));
    await vi.waitFor(() =>
      expect(document.querySelectorAll('.lint-finding')).toHaveLength(2),
    );
    expect(
      getElement<HTMLElement>('[data-client="outlook-windows"]').tagName,
    ).not.toBe('BUTTON');
  });

  it('highlights only a unique DOM match without accepting CSS, markup, or URL injection through selectors', () => {
    const html =
      '<!doctype html><html><head></head><body><p id="notice">Hello</p><p>Other</p></body></html>';
    const output = withPreviewContentSecurityPolicy(
      withPreviewHighlight(withPreviewColorMode(html, 'dark'), '#notice'),
      false,
    );
    const document = new DOMParser().parseFromString(output, 'text/html');
    expect(
      document.querySelectorAll(
        '[data-chakra-email-preview-highlight="selected"]',
      ),
    ).toHaveLength(1);
    expect(
      document
        .querySelector('#notice')
        ?.getAttribute('data-chakra-email-preview-highlight'),
    ).toBe('selected');
    expect(
      document.querySelectorAll('[data-chakra-email-preview-highlight-style]'),
    ).toHaveLength(1);
    expect(
      document.querySelector('style[data-chakra-email-preview-highlight-style]')
        ?.textContent,
    ).toContain('outline:2px dashed');
    expect(output).toContain(':root{color-scheme:only dark}');
    expect(output).toContain("script-src 'none'");
    expect(output).toContain('<!DOCTYPE html>');
    for (const selector of [
      undefined,
      'p',
      '#missing',
      '*',
      '[',
      'p{background:url(https://evil.test)}',
      '</style><script>alert(1)</script>',
      'p} @import "https://evil.test";',
      'x'.repeat(4097),
    ]) {
      expect(withPreviewHighlight(html, selector)).toBe(html);
    }
    const unusual = '<p id="a{background:url(https://evil.test)}">Hello</p>';
    const safelyResolved = withPreviewHighlight(
      unusual,
      '[id="a{background:url(https://evil.test)}"]',
    );
    const safeDocument = new DOMParser().parseFromString(
      safelyResolved,
      'text/html',
    );
    expect(safeDocument.querySelector('style')?.textContent).not.toContain(
      'evil.test',
    );
    expect(safeDocument.querySelector('style')?.textContent).not.toContain(
      'url(',
    );
    expect(safeDocument.querySelector('script')).toBeNull();
  });

  it('validates highlight colors and replaces its own marker and style on repeated rewrites', () => {
    const html = '<p id="first">First</p><p id="second">Second</p>';
    const first = withPreviewHighlight(html, '#first', '#123456');
    expect(first).toContain('outline:2px dashed rgb(18, 52, 86)');
    const second = withPreviewHighlight(first, '#second', 'rebeccapurple');
    const document = new DOMParser().parseFromString(second, 'text/html');
    expect(
      document.querySelectorAll('[data-chakra-email-preview-highlight-style]'),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll(
        '[data-chakra-email-preview-highlight="selected"]',
      ),
    ).toHaveLength(1);
    expect(
      document
        .querySelector('#first')
        ?.hasAttribute('data-chakra-email-preview-highlight'),
    ).toBe(false);
    expect(
      document
        .querySelector('#second')
        ?.getAttribute('data-chakra-email-preview-highlight'),
    ).toBe('selected');
    expect(document.querySelector('style')?.textContent).toContain(
      'rebeccapurple',
    );
    for (const color of [
      'not-a-color',
      'red; background:url(https://evil.test)',
      '</style><script>alert(1)</script>',
      'var(--injected, </style><img src=https://evil.test>)',
      'url(https://evil.test)',
    ]) {
      const output = withPreviewHighlight(html, '#first', color);
      const parsed = new DOMParser().parseFromString(output, 'text/html');
      expect(parsed.querySelector('style')?.textContent).toContain('#f5a524');
      expect(parsed.querySelector('style')?.textContent).not.toContain(
        'evil.test',
      );
      expect(parsed.querySelector('script')).toBeNull();
    }
  });

  it('keeps authored head selectors accurate after injecting color-mode and highlight styles', () => {
    const html =
      '<html><head><style>.example { display:grid }</style><style>.another { display:flex }</style></head><body>Preview</body></html>';
    const output = withPreviewHighlight(
      withPreviewColorMode(html, 'dark'),
      'html > head:nth-child(1) > style:nth-child(1)',
    );
    const parsed = new DOMParser().parseFromString(output, 'text/html');
    expect(
      parsed.querySelector('[data-chakra-email-preview-highlight="selected"]')
        ?.textContent,
    ).toContain('display:grid');
    expect(
      parsed.querySelector(
        'style[data-chakra-email-preview-color-mode="dark"]',
      ),
    ).not.toBeNull();
    const repeated = new DOMParser().parseFromString(
      withPreviewHighlight(
        output,
        'html > head:nth-child(1) > style:nth-child(2)',
      ),
      'text/html',
    );
    expect(
      repeated.querySelector('[data-chakra-email-preview-highlight="selected"]')
        ?.textContent,
    ).toContain('display:flex');
    expect(
      repeated.querySelectorAll('[data-chakra-email-preview-highlight-style]'),
    ).toHaveLength(1);
  });

  it('uses the resolved workspace highlight color in Preview and all Compare frames', async () => {
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element, pseudo) => {
        const result = computedStyle(element, pseudo);
        if (
          (element as HTMLElement).style.color !==
          'var(--chakra-colors-preview-highlight)'
        )
          return result;
        return new Proxy(result, {
          get: (target, key) =>
            key === 'color' ? 'rgb(12, 34, 56)' : Reflect.get(target, key),
        });
      },
    );
    const harness = createHarness({
      theme: {
        semanticTokens: {
          colors: { preview: { highlight: { value: '#0c2238' } } },
        },
      },
    });
    await harness.application.start();
    getElement<HTMLButtonElement>(
      '[data-lint-rule="image-alt"] button',
    ).click();
    expect(
      getElement<HTMLIFrameElement>('#email-preview-frame').srcdoc,
    ).toContain('outline:2px dashed rgb(12, 34, 56)');
    getElement<HTMLButtonElement>('[data-tab="compare"]').click();
    document
      .querySelectorAll<HTMLIFrameElement>('.compare-frames iframe')
      .forEach((frame) => {
        expect(frame.srcdoc).toContain('outline:2px dashed rgb(12, 34, 56)');
      });
  });

  it('validates and sends the active template through the configured transport', async () => {
    const harness = createHarness();
    await harness.application.start();

    getElement<HTMLButtonElement>('[data-action="test-send"]').click();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'valid recipient',
    );
    expect(harness.sendRequests).toHaveLength(0);

    const recipient = getElement<HTMLInputElement>('#test-send-to');
    recipient.value = 'ada@example.com';
    recipient.dispatchEvent(new Event('input', { bubbles: true }));
    const subject = getElement<HTMLInputElement>('#test-send-subject');
    expect(subject.value).toBe('Welcome Ada');
    subject.value = 'A preview for Ada';
    subject.dispatchEvent(new Event('input', { bubbles: true }));
    getElement<HTMLButtonElement>('[data-action="test-send"]').click();

    await vi.waitFor(() => {
      expect(harness.sendRequests).toEqual([
        {
          id: 'welcome',
          props: { name: 'Ada' },
          subject: 'A preview for Ada',
          to: 'ada@example.com',
        },
      ]);
      expect(
        document.querySelector('.test-send [role="status"]')?.textContent,
      ).toContain('sent to ada@example.com');
    });

    harness.application.destroy();
  });

  it('switches output tabs with keyboard navigation and copies the active output', async () => {
    const harness = createHarness();
    await harness.application.start();

    await clickExport('download');
    expect(harness.downloadText).toHaveBeenCalledWith(
      expect.stringContaining('<h1>Hello</h1>'),
      'welcome-email.html',
      'text/html;charset=utf-8',
    );

    const htmlTab = getElement<HTMLButtonElement>('[data-tab="html"]');
    htmlTab.click();
    await flush();
    const panel = document.getElementById(
      htmlTab.getAttribute('aria-controls') ?? '',
    );
    expect(panel?.getAttribute('role')).toBe('tabpanel');
    expect(panel?.getAttribute('aria-labelledby')).toBe(htmlTab.id);
    expect(htmlTab.getAttribute('data-ownedby')).toBe(
      document.querySelector('[role="tablist"]')?.id,
    );
    expect(document.querySelector('.code-heading')?.textContent).toContain(
      '.html',
    );
    await clickExport('copy');

    await vi.waitFor(() => {
      expect(harness.copyText).toHaveBeenCalledWith(
        expect.stringContaining('<h1>Hello</h1>'),
      );
    });
    expect(document.querySelector('[data-copy-status]')?.textContent).toContain(
      'Copied',
    );

    const currentHtmlTab = getElement<HTMLButtonElement>('[data-tab="html"]');
    currentHtmlTab.focus();
    await flush();
    currentHtmlTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    );
    await vi.waitFor(() => {
      expect(document.activeElement?.getAttribute('data-tab')).toBe('text');
      expect(document.activeElement?.getAttribute('aria-selected')).toBe(
        'true',
      );
    });

    expect(
      document
        .querySelector<HTMLButtonElement>('[data-tab="text"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(document.activeElement?.getAttribute('data-tab')).toBe('text');
    expect(document.querySelector('.code-heading')?.textContent).toContain(
      'text/plain',
    );

    await clickExport('download');
    expect(harness.downloadText).toHaveBeenCalledWith(
      'Hello from the plain-text email.',
      'welcome-email.txt',
      'text/plain;charset=utf-8',
    );

    await clickExport('copy');
    await vi.waitFor(() => {
      expect(harness.copyText).toHaveBeenLastCalledWith(
        'Hello from the plain-text email.',
      );
    });

    const textTab = getElement<HTMLButtonElement>('[data-tab="text"]');
    textTab.focus();
    textTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'End' }),
    );
    await vi.waitFor(() => {
      expect(document.activeElement?.getAttribute('data-tab')).toBe('source');
      expect(document.activeElement?.getAttribute('aria-selected')).toBe(
        'true',
      );
    });
    expect(document.activeElement?.getAttribute('data-tab')).toBe('source');

    await clickExport('download');
    expect(harness.downloadText).toHaveBeenLastCalledWith(
      'export default function WelcomeEmail() { return <Html />; }',
      'welcome-email.tsx',
      'text/plain;charset=utf-8',
    );

    const sourceTab = getElement<HTMLButtonElement>('[data-tab="source"]');
    sourceTab.focus();
    sourceTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }),
    );
    await vi.waitFor(() => {
      expect(document.activeElement?.getAttribute('data-tab')).toBe('preview');
      expect(document.activeElement?.getAttribute('aria-selected')).toBe(
        'true',
      );
    });
    expect(document.activeElement?.getAttribute('data-tab')).toBe('preview');

    const previewTab = getElement<HTMLButtonElement>('[data-tab="preview"]');
    previewTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }),
    );
    await vi.waitFor(() => {
      expect(document.activeElement?.getAttribute('data-tab')).toBe('source');
      expect(document.activeElement?.getAttribute('aria-selected')).toBe(
        'true',
      );
    });
    expect(document.activeElement?.getAttribute('data-tab')).toBe('source');

    await clickExport('copy');
    await vi.waitFor(() => {
      expect(harness.copyText).toHaveBeenLastCalledWith(
        expect.stringContaining('function WelcomeEmail'),
      );
    });

    harness.application.destroy();
  });

  it('surfaces download failures without discarding the rendered email', async () => {
    const harness = createHarness({
      downloadText: () => {
        throw new Error('Downloads are blocked.');
      },
    });
    await harness.application.start();

    await clickExport('download');

    expect(document.querySelector('.error-banner')?.textContent).toContain(
      'Downloads are blocked.',
    );
    expect(document.querySelector('#email-preview-frame')).not.toBeNull();

    harness.application.destroy();
  });

  it('clears copied announcements when the output context changes', async () => {
    const harness = createHarness();
    await harness.application.start();
    await clickExport('copy');
    await vi.waitFor(() =>
      expect(getElement('[data-copy-status]').textContent).toContain(
        'Copied HTML',
      ),
    );
    getElement<HTMLButtonElement>('[data-tab="text"]').click();
    await vi.waitFor(() =>
      expect(getElement('[data-copy-status]').textContent).toBe(''),
    );
    await clickExport('copy');
    await vi.waitFor(() =>
      expect(getElement('[data-copy-status]').textContent).toContain(
        'Copied text',
      ),
    );
    getElement<HTMLButtonElement>('[data-action="reset-props"]').click();
    expect(getElement('[data-copy-status]').textContent).toBe('');
    await flush();
    harness.application.destroy();
  });

  it.each(['resolve', 'reject'])(
    'ignores a late clipboard %s after changing tabs',
    async (outcome) => {
      let resolveCopy: () => void = () => undefined;
      let rejectCopy: (error: Error) => void = () => undefined;
      const harness = createHarness({
        copyText: () =>
          new Promise<void>((resolve, reject) => {
            resolveCopy = resolve;
            rejectCopy = reject;
          }),
      });
      await harness.application.start();
      await clickExport('copy');
      getElement<HTMLButtonElement>('[data-tab="text"]').click();
      await vi.waitFor(() =>
        expect(
          getElement('[data-action="copy"]').getAttribute('aria-label'),
        ).toBe('Copy text'),
      );
      if (outcome === 'resolve') resolveCopy();
      else rejectCopy(new Error('Old clipboard failure'));
      await flush();
      expect(getElement('[data-copy-status]').textContent).toBe('');
      expect(document.body.textContent).not.toContain('Old clipboard failure');
      harness.application.destroy();
    },
  );

  it('changes viewport size and only permits remote images after explicit opt-in', async () => {
    const harness = createHarness();
    await harness.application.start();

    document
      .querySelector<HTMLButtonElement>('[data-viewport="mobile"]')
      ?.click();
    expect(
      document.querySelector('.preview-surface')?.getAttribute('data-viewport'),
    ).toBe('mobile');

    const remoteImages = getElement<HTMLInputElement>('#remote-images');
    remoteImages.click();
    await flush();

    const iframe = document.querySelector<HTMLIFrameElement>(
      '#email-preview-frame',
    );
    expect(iframe?.srcdoc).toContain('img-src https: http: data: blob:');
    expect(iframe?.getAttribute('sandbox')).toBe('');

    harness.application.destroy();
  });

  it('persists independent workspace and email modes and keeps host classes intact', async () => {
    document.documentElement.classList.add('host-class');
    window.localStorage.setItem(
      'chakra-email.preview.workspace-color-mode',
      'light',
    );
    const harness = createHarness();
    await harness.application.start();
    const requests = harness.renderRequests.length;
    expect(
      document.querySelector('[data-action="toggle-workspace-color-mode"]'),
    ).toBeNull();
    expect(
      document.querySelectorAll('button[data-email-color-mode]'),
    ).toHaveLength(2);
    for (const mode of ['dark', 'light', 'dark']) {
      const button = getElement<HTMLButtonElement>(
        'button[data-email-color-mode="' + mode + '"]',
      );
      button.focus();
      button.click();
      expect(document.activeElement).toBe(button);
      expect(
        getElement<HTMLIFrameElement>('#email-preview-frame').style.colorScheme,
      ).toBe('only ' + mode);
      expect(
        window.localStorage.getItem('chakra-email.preview.email-color-mode'),
      ).toBe(mode);
      expect(document.documentElement.dataset['theme']).toBe('light');
      expect(document.documentElement.classList.contains('host-class')).toBe(
        true,
      );
      expect(harness.renderRequests).toHaveLength(requests);
    }
    expect(
      window.localStorage.getItem('chakra-email.preview.workspace-color-mode'),
    ).toBe('light');
    harness.application.destroy();
    const restored = createHarness();
    await restored.application.start();
    expect(
      getElement<HTMLIFrameElement>('#email-preview-frame').style.colorScheme,
    ).toBe('only dark');
    expect(
      getElement('[data-action="toggle-email-color-mode"]').getAttribute(
        'aria-label',
      ),
    ).toBe('Preview email in light mode');
    restored.application.destroy();
  });

  it('connects the Remote Images tooltip to the switch input and dismisses it with Escape', async () => {
    const harness = createHarness();
    await harness.application.start();

    const input = getElement<HTMLInputElement>('#remote-images');
    expect(input.checked).toBe(false);
    input.focus();

    await vi.waitFor(() => {
      const descriptionId = input.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();
      expect(
        document.getElementById(descriptionId ?? '')?.textContent,
      ).toContain('Scripts and forms are disabled. Remote images stay blocked');
    });
    expect(input.checked).toBe(false);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await vi.waitFor(() =>
      expect(input.getAttribute('aria-describedby')).toBeNull(),
    );

    getElement<HTMLElement>(
      '#remote-images-control [data-part="control"]',
    ).click();
    await vi.waitFor(() => expect(input.checked).toBe(true));
    getElement<HTMLButtonElement>('[data-tab="html"]').click();
    await vi.waitFor(() => expect(input.disabled).toBe(true));
    input.click();
    expect(input.checked).toBe(true);

    harness.application.destroy();
  });

  it('provides five labeled output tabs with keyboard navigation and associated panels', async () => {
    const harness = createHarness();
    await harness.application.start();
    const list = getElement(
      '[role="tablist"][aria-label="Email output format"]',
    );
    expect(list.querySelectorAll('button')).toHaveLength(5);
    for (const [id, label] of [
      ['preview', 'Preview'],
      ['compare', 'Compare'],
      ['html', 'HTML'],
      ['text', 'Text'],
      ['source', 'Source'],
    ]) {
      const tab = getElement<HTMLButtonElement>('[data-tab="' + id + '"]');
      tab.click();
      await vi.waitFor(() =>
        expect(tab.getAttribute('aria-selected')).toBe('true'),
      );
      expect(tab.getAttribute('role')).toBe('tab');
      expect(tab.textContent).toBe(label);
      expect(tab.getAttribute('data-ownedby')).toBe(list.id);
      expect(list.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
      const panel = document.getElementById(
        tab.getAttribute('aria-controls') ?? '',
      );
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
    }
    const source = getElement<HTMLButtonElement>('[data-tab="source"]');
    source.focus();
    source.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await vi.waitFor(() =>
      expect(document.activeElement?.getAttribute('data-tab')).toBe('preview'),
    );
    harness.application.destroy();
  });

  it('gives the new toolbar icon actions accessible names, selection state, and focus tooltips', async () => {
    const harness = createHarness();
    await harness.application.start();
    for (const [selector, name] of [
      ['[data-action="export"]', 'Export email'],
      ['[data-action="palette"]', 'Open command palette'],
      ['button[data-viewport="desktop"]', 'Desktop preview'],
      ['button[data-viewport="mobile"]', 'Mobile preview'],
    ]) {
      const button = getElement<HTMLButtonElement>(selector);
      expect(button.getAttribute('aria-label')).toBe(name);
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
      expect(button.querySelector('svg')?.getAttribute('focusable')).toBe(
        'false',
      );
      button.focus();
      await vi.waitFor(() =>
        expect(button.getAttribute('aria-describedby')).toBeTruthy(),
      );
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await vi.waitFor(() =>
        expect(button.getAttribute('aria-describedby')).toBeNull(),
      );
    }
    getElement<HTMLButtonElement>('button[data-viewport="mobile"]').click();
    expect(
      getElement('button[data-viewport="mobile"]').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      getElement('button[data-viewport="desktop"]').getAttribute(
        'aria-pressed',
      ),
    ).toBe('false');
    expect(document.querySelector('button[data-viewport="fluid"]')).toBeNull();
    const mobile = getElement<HTMLButtonElement>(
      'button[data-viewport="mobile"]',
    );
    mobile.focus();
    mobile.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    expect(
      getElement('button[data-viewport="desktop"]').getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    expect(harness.renderRequests).toHaveLength(1);
    harness.application.destroy();
  });

  it('explains the email color controls and desktop preset with focus tooltips', async () => {
    const harness = createHarness();
    await harness.application.start();
    const color = getElement<HTMLButtonElement>(
      '[data-action="toggle-email-color-mode"]',
    );
    color.focus();
    await vi.waitFor(() =>
      expect(
        document.getElementById(color.getAttribute('aria-describedby') ?? '')
          ?.textContent,
      ).toContain('Dark client (l)'),
    );
    color.blur();
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    const desktop = getElement<HTMLButtonElement>(
      'button[data-viewport="desktop"]',
    );
    desktop.focus();
    await vi.waitFor(() =>
      expect(
        document.getElementById(desktop.getAttribute('aria-describedby') ?? '')
          ?.textContent,
      ).toContain('600 px'),
    );
    expect(color.getAttribute('aria-label')).toBe('Preview email in dark mode');
    harness.application.destroy();
  });

  it.each([false, true])(
    'follows the OS for the workspace while legacy System email preferences default to light (OS dark: %s)',
    async (initialDark) => {
      let dark = initialDark;
      const query = new EventTarget() as MediaQueryList;
      Object.defineProperty(query, 'matches', { get: () => dark });
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => query),
      );
      window.localStorage.setItem(
        'chakra-email.preview.email-color-mode',
        'system',
      );
      const harness = createHarness();
      await harness.application.start();
      const iframe = getElement<HTMLIFrameElement>('#email-preview-frame');
      expect(iframe.style.colorScheme).toBe('only light');
      dark = !dark;
      query.dispatchEvent(new Event('change'));
      expect(iframe.style.colorScheme).toBe('only light');
      expect(document.documentElement.dataset['theme']).toBe(
        dark ? 'dark' : 'light',
      );
      harness.application.destroy();
    },
  );

  it('disables the email mode toggle when no template is available', async () => {
    const harness = createHarness();
    harness.setTemplates([]);
    await harness.application.start();
    expect(
      getElement<HTMLButtonElement>('[data-action="toggle-email-color-mode"]')
        .disabled,
    ).toBe(true);
    expect(document.documentElement.dataset['theme']).toBe('dark');
    harness.application.destroy();
  });

  it('toggles authored email colors without changing copied or downloaded output', async () => {
    const harness = createHarness();
    await harness.application.start();

    getElement<HTMLButtonElement>(
      '[data-action="toggle-email-color-mode"]',
    ).click();

    let iframe = getElement<HTMLIFrameElement>('#email-preview-frame');
    expect(iframe.dataset['emailColorMode']).toBe('dark');
    expect(iframe.style.colorScheme).toBe('only dark');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: dark)');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: light)');
    expect(iframe.srcdoc).toContain(
      'data-chakra-email-preview-color-mode="dark"',
    );
    expect(iframe.srcdoc).toContain('@media all{.ce-mode-0');
    await clickExport('download');
    await clickExport('copy');
    await vi.waitFor(() => expect(harness.copyText).toHaveBeenCalled());
    for (const output of [
      harness.copyText.mock.calls[0]?.[0],
      harness.downloadText.mock.calls[0]?.[0],
    ]) {
      expect(output).toContain(
        '@media (prefers-color-scheme: dark){.ce-mode-0',
      );
      expect(output).not.toContain('data-chakra-email-preview-color-mode');
      expect(output).not.toContain('@media all');
    }
    expect(
      window.localStorage.getItem('chakra-email.preview.email-color-mode'),
    ).toBe('dark');

    getElement<HTMLButtonElement>(
      '[data-action="toggle-email-color-mode"]',
    ).click();

    iframe = getElement<HTMLIFrameElement>('#email-preview-frame');
    expect(iframe.style.colorScheme).toBe('only light');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: dark)');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: light)');
    expect(iframe.srcdoc).toContain('@media not all{.ce-mode-0');
    expect(iframe.srcdoc).toContain(
      'data-chakra-email-preview-color-mode="light"',
    );

    harness.application.destroy();
  });

  it('keeps the dark canvas and its recipe override independent of the email', async () => {
    const harness = createHarness({
      theme: {
        slotRecipes: {
          [previewSlotRecipeKeys.viewer]: {
            base: { surface: { bg: 'var(--test-canvas-color)' } },
          },
        },
      },
    });
    await harness.application.start();
    const surface = getElement('.preview-surface');
    const canvasClass = surface.className;
    const workspaceClass = document.documentElement.className;
    expect(
      elementDeclarations(surface).some(
        (style) =>
          (style.getPropertyValue('background') ||
            style.getPropertyValue('background-color')) ===
          'var(--test-canvas-color)',
      ),
    ).toBe(true);
    for (const mode of ['dark', 'light']) {
      getElement<HTMLButtonElement>(
        '[data-action="toggle-email-color-mode"]',
      ).click();
      const iframe = getElement<HTMLIFrameElement>('#email-preview-frame');
      expect(iframe.dataset['emailColorMode']).toBe(mode);
      expect(iframe.style.colorScheme).toBe(`only ${mode}`);
      expect(surface.className).toBe(canvasClass);
      expect(surface.hasAttribute('data-email-color-mode')).toBe(false);
      expect(document.documentElement.className).toBe(workspaceClass);
      expect(document.documentElement.dataset['theme']).toBe('dark');
    }
    harness.application.destroy();
  });

  it('switches templates and presents an empty state after rediscovery', async () => {
    const harness = createHarness();
    await harness.application.start();

    document
      .querySelector<HTMLButtonElement>('[data-template-id="receipt"]')
      ?.click();
    await vi.waitFor(() => {
      expect(harness.renderRequests.at(-1)).toEqual({ id: 'receipt' });
      expect(document.querySelector('h1')?.textContent).toContain(
        'Order receipt',
      );
    });

    harness.setTemplates([]);
    harness.eventSource.dispatchEvent(new Event('templates'));
    harness.eventSource.dispatchEvent(new Event('templates'));

    await vi.waitFor(() => {
      expect(document.querySelectorAll('[data-template-id]')).toHaveLength(0);
      expect(document.querySelector('.empty-sidebar')?.textContent).toContain(
        'No templates found',
      );
    });

    harness.application.destroy();
  });

  it('recovers discovery from an empty project when the user retries', async () => {
    const harness = createHarness();
    harness.setTemplates([]);
    await harness.application.start();

    harness.setTemplates([{ id: 'welcome', name: 'Welcome email' }]);
    document.querySelector<HTMLButtonElement>('[data-action="retry"]')?.click();

    await vi.waitFor(() => {
      expect(harness.renderRequests).toHaveLength(1);
      expect(
        document.querySelector('[data-template-id="welcome"]'),
      ).not.toBeNull();
    });

    harness.application.destroy();
  });

  it('surfaces render failures, retries them, and lets the user dismiss the error', async () => {
    let renderAttempts = 0;
    const fetcher = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> => {
        if (input === '/api/templates') {
          return jsonResponse([
            { id: 'welcome', name: 'Welcome email', path: 'welcome.tsx' },
          ]);
        }

        renderAttempts += 1;
        return jsonResponse(
          { error: { message: 'Template compilation failed on line 12.' } },
          500,
        );
      },
    );
    const harness = createHarness({ fetch: fetcher });
    await harness.application.start();

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Template compilation failed',
    );
    document.querySelector<HTMLButtonElement>('[data-action="retry"]')?.click();
    await vi.waitFor(() => {
      expect(renderAttempts).toBe(2);
    });
    document
      .querySelector<HTMLButtonElement>('[data-action="dismiss-error"]')
      ?.click();
    expect(document.querySelector('.error-banner')).toBeNull();

    harness.application.destroy();
  });

  it('reports malformed discovery responses clearly', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ unexpected: [] }));
    const harness = createHarness({ fetch: fetcher });
    await harness.application.start();

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'invalid template list',
    );

    harness.application.destroy();
  });

  it('refreshes from server events while preserving the active template', async () => {
    const harness = createHarness();
    await harness.application.start();
    expect(harness.renderRequests).toHaveLength(1);

    harness.eventSource.dispatchEvent(new Event('open'));
    expect(
      document.querySelector('.sidebar [role="status"]')?.textContent,
    ).toContain('Watching · rebuilt');

    harness.eventSource.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'invalidate', id: 'welcome' }),
      }),
    );
    await vi.waitFor(() => {
      expect(harness.renderRequests).toHaveLength(2);
    });

    harness.eventSource.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'invalidate', id: 'receipt' }),
      }),
    );
    await flush();
    expect(harness.renderRequests).toHaveLength(2);

    harness.setTemplates([
      { id: 'welcome', name: 'Welcome email' },
      { id: 'receipt', name: 'Order receipt' },
      { id: 'digest', name: 'Weekly digest' },
    ]);
    harness.eventSource.dispatchEvent(new Event('templates'));

    await vi.waitFor(() => {
      expect(
        document.querySelectorAll<HTMLButtonElement>('[data-template-id]'),
      ).toHaveLength(3);
    });
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-template-id="welcome"]')
        ?.getAttribute('aria-current'),
    ).toBe('page');

    harness.eventSource.dispatchEvent(new Event('error'));
    expect(
      document.querySelector('.sidebar [role="status"]')?.textContent,
    ).toContain('Reconnecting');

    harness.application.destroy();
  });

  it('shows actionable server errors without discarding the application shell', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ message: 'Preview token was rejected.' }, 403),
    );
    const harness = createHarness({ fetch: fetcher });

    await harness.application.start();

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Preview token was rejected',
    );
    expect(document.querySelector('.brand')?.textContent).toContain(
      'Chakra Email',
    );
    expect(
      document.querySelector<HTMLButtonElement>('[data-action="retry"]'),
    ).not.toBeNull();

    harness.application.destroy();
  });

  it('defaults to Fields, applies edits after 300ms, and keeps JSON and preferences in sync', async () => {
    window.localStorage.removeItem('chakra-email.preview.props-mode');
    window.localStorage.setItem('chakra-email.preview.viewport', 'fluid');
    const harness = createHarness();
    await harness.application.start();
    expect(
      getElement('[data-props-mode="fields"]').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      getElement('button[data-viewport="desktop"]').getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    vi.useFakeTimers();
    const field = getElement<HTMLInputElement>('#prop-field-0');
    field.value = 'Grace';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(299);
    expect(harness.renderRequests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.renderRequests.at(-1)?.props).toEqual({ name: 'Grace' });
    getElement<HTMLButtonElement>('[data-props-mode="json"]').click();
    expect(getElement<HTMLTextAreaElement>('#preview-props').value).toContain(
      'Grace',
    );
    expect(window.localStorage.getItem('chakra-email.preview.props-mode')).toBe(
      'json',
    );
    vi.useRealTimers();
    harness.application.destroy();
  });

  it('keeps typed field drafts stable, blocks invalid numbers, and preserves nested nullable and boolean props', async () => {
    window.localStorage.removeItem('chakra-email.preview.props-mode');
    const fixture = { values: { count: 2, note: null, active: true } };
    const harness = createHarness({}, fixture);
    await harness.application.start();
    const originalFrame = getElement<HTMLIFrameElement>('iframe').srcdoc;
    vi.useFakeTimers();
    const input = (id: string, value: string) => {
      const field = document.getElementById(id) as HTMLInputElement;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    input('prop-field-0', '');
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.renderRequests).toHaveLength(1);
    expect(document.getElementById('prop-field-0')?.getAttribute('type')).toBe(
      'number',
    );
    expect(
      document.getElementById('prop-field-0')?.getAttribute('aria-invalid'),
    ).toBe('true');
    expect(document.querySelector('#props-error')?.textContent).toContain(
      'values.count: Enter a finite number.',
    );
    expect(getElement<HTMLIFrameElement>('iframe').srcdoc).toBe(originalFrame);
    input('prop-field-1', 'temporary');
    input('prop-field-1', '');
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.renderRequests).toHaveLength(1);
    input('prop-field-0', '3.5');
    getElement<HTMLInputElement>('#prop-field-2').click();
    await vi.advanceTimersByTimeAsync(300);
    expect(harness.renderRequests.at(-1)?.props).toEqual({
      values: { count: 3.5, note: null, active: false },
    });
    expect(document.querySelector('#props-error')).toBeNull();
    expect(document.getElementById('prop-field-0')?.getAttribute('step')).toBe(
      'any',
    );
    getElement<HTMLButtonElement>('[data-props-mode="json"]').click();
    expect(
      JSON.parse(getElement<HTMLTextAreaElement>('#preview-props').value),
    ).toEqual({ values: { count: 3.5, note: null, active: false } });
    getElement<HTMLButtonElement>('[data-action="reset-props"]').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(
      JSON.parse(getElement<HTMLTextAreaElement>('#preview-props').value),
    ).toEqual(fixture);
    harness.application.destroy();
    vi.useRealTimers();
  });

  it('uses JSON for arrays and empty objects and rebuilds the field schema after JSON edits', async () => {
    window.localStorage.removeItem('chakra-email.preview.props-mode');
    const harness = createHarness({}, { values: { items: [] } });
    await harness.application.start();
    expect(document.querySelector('#preview-props')).not.toBeNull();
    expect(
      document.querySelector('[aria-label="Preview settings"]')?.textContent,
    ).toContain('Edit in JSON');
    vi.useFakeTimers();
    const editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.value = '{"values":{"count":1}}';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.getElementById('prop-field-0')?.getAttribute('type')).toBe(
      'number',
    );
    await vi.advanceTimersByTimeAsync(300);
    expect(harness.renderRequests.at(-1)?.props).toEqual({
      values: { count: 1 },
    });
    harness.application.destroy();
    vi.useRealTimers();
  });

  it('discards invalid fields and pending edits when the variant changes', async () => {
    window.localStorage.removeItem('chakra-email.preview.props-mode');
    const harness = createHarness({}, { count: 2 });
    await harness.application.start();
    vi.useFakeTimers();
    const field = getElement<HTMLInputElement>('#prop-field-0');
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('#props-error')).not.toBeNull();
    const variant = getElement<HTMLSelectElement>('#variant');
    variant.value = 'reminder';
    variant.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector('#props-error')).toBeNull();
    expect(harness.renderRequests).toHaveLength(2);
    expect(harness.renderRequests.at(-1)).toEqual({
      id: 'welcome',
      variant: 'reminder',
    });
    expect(getElement<HTMLInputElement>('#prop-field-0').value).toBe('3');
    harness.application.destroy();
    vi.useRealTimers();
  });

  it('gives literal dotted keys and nested paths unique controls without editing the wrong value', async () => {
    window.localStorage.removeItem('chakra-email.preview.props-mode');
    const harness = createHarness({}, { 'a.b': 'flat', a: { b: 'nested' } });
    await harness.application.start();
    expect(document.querySelectorAll('#prop-field-0')).toHaveLength(1);
    expect(document.querySelectorAll('#prop-field-1')).toHaveLength(1);
    expect(getElement<HTMLInputElement>('#prop-field-1').value).toBe('nested');
    vi.useFakeTimers();
    const field = getElement<HTMLInputElement>('#prop-field-0');
    field.value = 'updated flat';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);
    expect(harness.renderRequests.at(-1)?.props).toEqual({
      'a.b': 'updated flat',
      a: { b: 'nested' },
    });
    harness.application.destroy();
    vi.useRealTimers();
  });

  it('copies a named variant against the base fixture without changing the selected preview', async () => {
    const harness = createHarness();
    await harness.application.start();
    const select = getElement<HTMLSelectElement>('#variant');
    select.value = 'reminder';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() =>
      expect(harness.renderRequests.at(-1)?.variant).toBe('reminder'),
    );
    await vi.waitFor(() =>
      expect(
        getElement<HTMLButtonElement>('[data-action="copy-variant"]').disabled,
      ).toBe(false),
    );
    getElement<HTMLButtonElement>('[data-action="copy-variant"]').click();
    await vi.waitFor(() =>
      expect(document.querySelector('#preview-variant-name')).not.toBeNull(),
    );
    const name = getElement<HTMLInputElement>('#preview-variant-name');
    expect(name.value).toBe('Variant 3');
    name.value = 'Reminder';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    vi.useFakeTimers();
    getElement<HTMLButtonElement>('[data-action="copy-variant"]').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(harness.copyText).toHaveBeenCalledWith(
      "'Reminder': {\n  days: 3,\n  name: 'Grace',\n},\n",
    );
    expect(harness.renderRequests.at(-1)).toEqual({ id: 'welcome' });
    expect(select.value).toBe('reminder');
    expect(getElement<HTMLTextAreaElement>('#preview-props').value).toContain(
      'Grace',
    );
    expect(getElement('[data-action="copy-variant"]').textContent).toBe(
      'Copied',
    );
    await vi.advanceTimersByTimeAsync(1_999);
    expect(getElement('[data-action="copy-variant"]').textContent).toBe(
      'Copied',
    );
    await vi.advanceTimersByTimeAsync(1);
    expect(getElement('[data-action="copy-variant"]').textContent).toBe(
      'Copy as variant',
    );
  });

  it('blocks copying invalid props and reports empty names and clipboard failures inline', async () => {
    const harness = createHarness({
      copyText: vi.fn(async () => {
        throw new Error('Clipboard is unavailable.');
      }),
    });
    await harness.application.start();
    getElement<HTMLButtonElement>('[data-action="copy-variant"]').click();
    await vi.waitFor(() =>
      expect(document.querySelector('#preview-variant-name')).not.toBeNull(),
    );
    const name = getElement<HTMLInputElement>('#preview-variant-name');
    name.value = '  ';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    getElement<HTMLButtonElement>('[data-action="copy-variant"]').click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(
        'Enter a name for the variant.',
      ),
    );
    expect(harness.renderRequests).toHaveLength(1);
    name.value = 'Variant 3';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    getElement<HTMLButtonElement>('[data-action="copy-variant"]').click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('Clipboard is unavailable.'),
    );
    const editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.value = '{invalid';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(
      getElement<HTMLButtonElement>('[data-action="copy-variant"]').disabled,
    ).toBe(true);
  });

  it('does not copy a stale baseline after the user switches templates', async () => {
    const harness = createHarness();
    await harness.application.start();
    getElement<HTMLButtonElement>('[data-action="copy-variant"]').click();
    await vi.waitFor(() =>
      expect(document.querySelector('#preview-variant-name')).not.toBeNull(),
    );
    const original = harness.fetcher.getMockImplementation() as (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
    let finish!: (response: Response) => void;
    harness.fetcher.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    getElement<HTMLButtonElement>('[data-action="copy-variant"]').click();
    getElement<HTMLButtonElement>('[data-template-id="receipt"]').click();
    await vi.waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toContain(
        'Order receipt',
      ),
    );
    finish(
      await original('/api/render', {
        body: JSON.stringify({ id: 'welcome' }),
      }),
    );
    await flush();
    expect(harness.copyText).not.toHaveBeenCalled();
  });

  it('renders three protected compare frames and opens the selected viewport and email mode', async () => {
    const harness = createHarness();
    await harness.application.start();
    getElement<HTMLButtonElement>('[data-tab="compare"]').click();
    await vi.waitFor(() =>
      expect(document.querySelectorAll('.compare-frames iframe')).toHaveLength(
        3,
      ),
    );
    const frames = [
      ...document.querySelectorAll<HTMLIFrameElement>('.compare-frames iframe'),
    ];
    for (const frame of frames) {
      expect(frame.getAttribute('sandbox')).toBe('');
      expect(frame.srcdoc).toContain("script-src 'none'");
      expect(frame.srcdoc).not.toContain('img-src https:');
    }
    expect(frames.map((frame) => frame.style.colorScheme)).toEqual([
      'only light',
      'only light',
      'only dark',
    ]);
    getElement<HTMLButtonElement>(
      '[aria-label="Open mobile dark preview"]',
    ).click();
    await vi.waitFor(() =>
      expect(
        getElement<HTMLIFrameElement>('#email-preview-frame').style.colorScheme,
      ).toBe('only dark'),
    );
    expect(
      getElement('button[data-viewport="mobile"]').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(window.localStorage.getItem('chakra-email.preview.viewport')).toBe(
      'mobile',
    );
    harness.application.destroy();
  });

  it('filters templates by name and path and excludes info-only summaries from With issues', async () => {
    const harness = createHarness();
    const implementation =
      harness.fetcher.getMockImplementation() as PreviewApplicationOptions['fetch'];
    if (!implementation) throw new Error('Missing mock fetch implementation');
    harness.fetcher.mockImplementation(async (input, init) => {
      const response = await implementation(input, init);
      if (
        input === '/api/render' &&
        JSON.parse(String(init?.body)).id === 'receipt'
      ) {
        const payload = await response.json();
        return jsonResponse({
          ...payload,
          lint: [{ ...payload.lint[0], severity: 'info' }],
        });
      }
      return response;
    });
    await harness.application.start();
    harness.eventSource.dispatchEvent(
      new MessageEvent('lint-summary', {
        data: JSON.stringify({
          generation: 1,
          templates: [
            { id: 'welcome', error: 1, warning: 1, info: 0 },
            { id: 'receipt', error: 0, warning: 0, info: 1 },
          ],
        }),
      }),
    );
    getElement<HTMLButtonElement>('[data-template-id="receipt"]').click();
    await vi.waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toContain(
        'Order receipt',
      ),
    );
    await vi.waitFor(() =>
      expect(
        document
          .querySelector('[data-template-id="receipt"]')
          ?.getAttribute('aria-label'),
      ).toContain('1 info'),
    );
    const filter = getElement<HTMLInputElement>('#template-filter');
    filter.value = 'SRC/RECEIPT';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelectorAll('[data-template-id]')).toHaveLength(1);
    expect(
      document.querySelector('[data-template-id="receipt"]'),
    ).not.toBeNull();
    filter.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(filter.value).toBe('');
    expect(document.querySelectorAll('[data-template-id]')).toHaveLength(2);
    const issues = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Template filter"] button',
      ),
    ].find((b) => b.textContent?.includes('With issues'));
    issues?.click();
    expect(document.querySelectorAll('[data-template-id]')).toHaveLength(1);
    expect(
      document
        .querySelector('[data-template-id="welcome"]')
        ?.getAttribute('aria-label'),
    ).toContain('1 error, 1 warning');
    expect(
      window.localStorage.getItem('chakra-email.preview.template-filter'),
    ).toBe('issues');
    harness.application.destroy();
  });

  it('receives default summaries before discovery finishes and shows issues on unvisited templates', async () => {
    const harness = createHarness();
    const started = harness.application.start();
    harness.eventSource.dispatchEvent(
      new MessageEvent('lint-summary', {
        data: JSON.stringify({
          generation: 1,
          templates: [
            { id: 'welcome', error: 0, warning: 0, info: 0 },
            { id: 'receipt', error: 0, warning: 4, info: 1 },
          ],
        }),
      }),
    );
    await started;
    expect(harness.renderRequests).toHaveLength(1);
    expect(
      getElement('[data-template-id="receipt"]').getAttribute('aria-label'),
    ).toContain('4 warnings, 1 info');
    expect(
      getElement('[data-template-id="welcome"]').getAttribute('aria-label'),
    ).toBe('Welcome email');
    // The active render still reports its own findings, not the sidebar's default snapshot.
    expect(getElement('.lint-summary').getAttribute('aria-label')).toContain(
      '1 error, 1 warning',
    );
    const issues = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Template filter"] button',
      ),
    ].find((button) => button.textContent?.includes('With issues'));
    issues?.click();
    expect(
      document.querySelector('[data-template-id="receipt"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-template-id="welcome"]')).toBeNull();
  });

  it('ignores stale or malformed summaries but accepts a restarted server after reconnect', async () => {
    const harness = createHarness();
    await harness.application.start();
    const emit = (generation: number, warning: number) =>
      harness.eventSource.dispatchEvent(
        new MessageEvent('lint-summary', {
          data: JSON.stringify({
            generation,
            templates: [{ id: 'welcome', error: 0, warning, info: 0 }],
          }),
        }),
      );
    expect(
      getElement('[data-template-id="welcome"]').getAttribute('aria-label'),
    ).toBe('Welcome email');
    emit(4, 4);
    emit(3, 3);
    emit(5, -1);
    harness.eventSource.dispatchEvent(
      new MessageEvent('lint-summary', { data: '{invalid' }),
    );
    expect(
      getElement('[data-template-id="welcome"]').getAttribute('aria-label'),
    ).toContain('4 warnings');
    harness.eventSource.dispatchEvent(new Event('open'));
    emit(1, 1);
    expect(
      getElement('[data-template-id="welcome"]').getAttribute('aria-label'),
    ).toContain('1 warning');
  });

  it('does not replace default sidebar counts when variants or edited props render', async () => {
    const harness = createHarness();
    await harness.application.start();
    harness.eventSource.dispatchEvent(
      new MessageEvent('lint-summary', {
        data: JSON.stringify({
          generation: 1,
          templates: [{ id: 'welcome', error: 0, warning: 5, info: 0 }],
        }),
      }),
    );
    const variant = getElement<HTMLSelectElement>('#variant');
    variant.value = 'reminder';
    variant.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() =>
      expect(harness.renderRequests.at(-1)?.variant).toBe('reminder'),
    );
    vi.useFakeTimers();
    const editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.value = '{"name":"Lin"}';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(300);
    expect(harness.renderRequests.at(-1)?.props).toEqual({ name: 'Lin' });
    expect(
      getElement('[data-template-id="welcome"]').getAttribute('aria-label'),
    ).toContain('5 warnings');
  });

  it('persists inspector tabs and derives passed checks from the returned catalog and rulesRun', async () => {
    const harness = createHarness();
    await harness.application.start();
    getElement<HTMLButtonElement>('[data-inspector-tab="info"]').click();
    await vi.waitFor(() =>
      expect(
        window.localStorage.getItem('chakra-email.preview.inspector-tab'),
      ).toBe('info'),
    );
    getElement<HTMLButtonElement>('[data-action="open-checks"]').click();
    expect(
      getElement('[data-inspector-tab="checks"]').getAttribute('aria-selected'),
    ).toBe('true');
    const disclosure = [...document.querySelectorAll('summary')].find((s) =>
      s.textContent?.includes('Passed'),
    );
    expect(disclosure?.textContent).toContain('1');
    expect(disclosure?.parentElement?.textContent).toContain('Valid HTML');
    expect(disclosure?.parentElement?.textContent).not.toContain(
      'Images have alternative text',
    );
    expect(
      document.querySelector('.lint-summary')?.getAttribute('data-lint-count'),
    ).toBe('2');
    harness.application.destroy();
  });

  it('uses keyboard shortcuts and a searchable palette without intercepting typing', async () => {
    const harness = createHarness();
    await harness.application.start();
    expect(document.querySelectorAll('.topbar')).toHaveLength(1);
    expect(document.querySelector('.workspace-heading')).toBeNull();
    const editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.dispatchEvent(
      new KeyboardEvent('keydown', { key: '2', bubbles: true }),
    );
    expect(document.querySelector('.compare-frames')).toBeNull();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: '2', bubbles: true }),
    );
    await vi.waitFor(() =>
      expect(document.querySelectorAll('.compare-frames iframe')).toHaveLength(
        3,
      ),
    );
    // Focus trapping needs layout visibility, which JSDOM does not calculate.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      { width: 1, height: 1 },
    ] as unknown as DOMRectList);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
    );
    await vi.waitFor(() =>
      expect(
        document.querySelector('[aria-label="Find a command"]'),
      ).not.toBeNull(),
    );
    const query = getElement<HTMLInputElement>('[aria-label="Find a command"]');
    await vi.waitFor(() => expect(document.activeElement).toBe(query));
    query.value = 'Interface theme: light';
    query.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[role="option"]')).toHaveLength(1),
    );
    query.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(
      window.localStorage.getItem('chakra-email.preview.workspace-color-mode'),
    ).toBe('light');
    expect(
      window.localStorage.getItem('chakra-email.preview.email-color-mode'),
    ).toBeNull();
    harness.application.destroy();
  });

  it('exports a local MIME message without sending mail', async () => {
    const harness = createHarness();
    await harness.application.start();
    getElement<HTMLButtonElement>('[data-action="export"]').click();
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-value="download-eml"]'),
      ).not.toBeNull(),
    );
    getElement<HTMLButtonElement>('[data-value="download-eml"]').click();
    expect(harness.downloadText).toHaveBeenCalledWith(
      expect.stringContaining('multipart/alternative'),
      'welcome-email.eml',
      'message/rfc822',
    );
    expect(harness.sendRequests).toHaveLength(0);
    harness.application.destroy();
  });

  it('uses server envelope metadata in the inbox, Info, and EML exports and opens only the template ID', async () => {
    const harness = createHarness();
    const original = harness.fetcher.getMockImplementation() as (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
    const open = vi.fn<(init?: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({}, 204),
    );
    harness.fetcher.mockImplementation(async (url, init) => {
      if (url === '/api/open') return open(init);
      const response = await original(url, init);
      const payload = (await response.json()) as Record<string, unknown>;
      if (url === '/api/templates')
        return jsonResponse({
          ...payload,
          capabilities: { testSend: true, openInEditor: true },
        });
      if (url === '/api/render')
        return jsonResponse({
          ...payload,
          from: { name: 'Forward', address: 'hello@forward.domains' },
          previewText: 'This preheader comes from the server.',
        });
      return response;
    });
    await harness.application.start();
    expect(document.querySelector('.inbox-preview')?.textContent).toContain(
      'hello@forward.domains',
    );
    expect(document.body.textContent).toContain(
      'This preheader comes from the server.',
    );
    getElement<HTMLButtonElement>('[data-inspector-tab="info"]').click();
    expect(document.body.textContent).toContain(
      'Forward <hello@forward.domains>',
    );
    getElement<HTMLButtonElement>('[data-action="open-editor"]').click();
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    const options = open.mock.calls[0]?.[0] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({ id: 'welcome' });
    expect(options.headers).toMatchObject({
      'x-chakra-email-preview-token': 'preview-token',
    });
    const download = [
      ...document.querySelectorAll<HTMLButtonElement>('button'),
    ].find((button) => button.textContent === 'Download .eml');
    download?.click();
    expect(harness.downloadText.mock.calls[0]?.[0]).toContain(
      'From: "Forward"\r\n <hello@forward.domains>',
    );
  });

  it('hides unavailable editor controls and reports editor failures inline with retry', async () => {
    const harness = createHarness();
    await harness.application.start();
    expect(document.querySelector('[data-action="open-editor"]')).toBeNull();
    const original = harness.fetcher.getMockImplementation() as (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
    let failing = true;
    harness.fetcher.mockImplementation(async (url, init) => {
      if (url === '/api/open')
        return failing
          ? jsonResponse(
              { error: { message: 'No editor found. Set EDITOR.' } },
              500,
            )
          : jsonResponse({}, 204);
      const response = await original(url, init);
      if (url === '/api/templates')
        return jsonResponse({
          ...(await response.json()),
          capabilities: { openInEditor: true },
        });
      return response;
    });
    harness.eventSource.dispatchEvent(new Event('templates'));
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-action="open-editor"]'),
      ).not.toBeNull(),
    );
    getElement<HTMLButtonElement>('[data-inspector-tab="info"]').click();
    getElement<HTMLButtonElement>('[data-action="open-editor"]').click();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(
        'No editor found. Set EDITOR.',
      ),
    );
    failing = false;
    getElement<HTMLButtonElement>('[data-action="open-editor"]').click();
    await vi.waitFor(() =>
      expect(document.body.textContent).not.toContain(
        'No editor found. Set EDITOR.',
      ),
    );
    expect(
      getElement<HTMLButtonElement>('[data-action="open-editor"]').disabled,
    ).toBe(false);
  });

  it.each([
    { from: { address: 'hello@example.com\nBcc: other@example.com' } },
    { from: { address: 'hello@example.com', name: false } },
    { previewText: 123 },
  ])('rejects malformed envelope metadata %#', async (metadata) => {
    const harness = createHarness();
    const original = harness.fetcher.getMockImplementation() as (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
    harness.fetcher.mockImplementation(async (url, init) => {
      const response = await original(url, init);
      return url === '/api/render'
        ? jsonResponse({ ...(await response.json()), ...metadata })
        : response;
    });
    await harness.application.start();
    expect(document.body.textContent).toContain('invalid envelope metadata');
  });

  it('has no automated accessibility violations in its rendered workspace', async () => {
    const harness = createHarness();
    await harness.application.start();
    document.querySelector('iframe')?.remove();

    const result = await axe.run(document, {
      resultTypes: ['violations'],
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    expect(result.violations).toEqual([]);
    harness.application.destroy();
  }, 60_000);
});

describe('withPreviewContentSecurityPolicy', () => {
  it('creates a complete protected document for an HTML fragment', () => {
    const secured = withPreviewContentSecurityPolicy('<p>Hello</p>', false);

    expect(secured).toMatch(/^<!doctype html>/);
    expect(secured).toContain("default-src 'none'");
    expect(secured).toContain(`img-src ${window.location.origin} data: blob:`);
    expect(secured).toContain('<body><p>Hello</p></body>');
  });

  it('adds a protected head to an existing HTML document', () => {
    const secured = withPreviewContentSecurityPolicy(
      '<html lang="en"><body>Hello</body></html>',
      true,
    );

    expect(secured).toContain('<html lang="en"><head>');
    expect(secured).toContain('img-src https: http: data: blob:');
    expect(secured).toContain('</head><body>Hello</body>');
  });

  it('leaves color-scheme media queries intact', () => {
    const secured = withPreviewContentSecurityPolicy(
      '<html><head><style>@media (prefers-color-scheme: dark) { body { color: white; } } @media (prefers-color-scheme: light) { body { color: black; } }</style></head><body>Hello</body></html>',
      false,
    );

    expect(secured).toContain('(prefers-color-scheme: dark)');
    expect(secured).toContain('(prefers-color-scheme: light)');
    expect(secured).not.toContain('chakra-email-preview-color-mode');
  });
});

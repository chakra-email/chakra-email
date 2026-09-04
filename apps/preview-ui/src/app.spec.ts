import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PreviewApplication,
  withPreviewContentSecurityPolicy,
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
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`Missing test element: ${selector}`);
  }

  return element;
}

function createHarness(overrides: Partial<PreviewApplicationOptions> = {}): {
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
          capabilities: { testSend: true },
          templates,
        });
      }

      if (input === '/api/render') {
        const request = JSON.parse(String(init?.body)) as RenderRequest;
        renderRequests.push(request);
        const props =
          request.props ??
          (request.variant === 'reminder'
            ? { days: 3, name: 'Grace' }
            : { name: 'Ada' });

        return jsonResponse({
          id: request.id,
          name: request.id === 'welcome' ? 'Welcome email' : 'Order receipt',
          html: '<!doctype html><html><head><style>@media (prefers-color-scheme: dark) { body { background: #111; } } @media (prefers-color-scheme: light) { body { background: #fff; } }</style></head><body><h1>Hello</h1><img src="https://images.example.test/hero.png"></body></html>',
          lint: [
            {
              category: 'accessibility',
              element: '<img>',
              line: 1,
              message: 'This image has no alt attribute.',
              ruleId: 'image-alt',
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
  beforeEach(() => {
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
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    document.documentElement.lang = 'en';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
    document.title = 'Chakra Email Preview';
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    expect(document.querySelector('.preview-subject')?.textContent).toContain(
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

  it('selects variants and validates editable JSON props before rendering', async () => {
    const harness = createHarness();
    await harness.application.start();

    const variant = getElement<HTMLSelectElement>('#variant');
    variant.value = 'reminder';
    variant.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(harness.renderRequests.at(-1)).toEqual({
        id: 'welcome',
        variant: 'reminder',
      });
      expect(
        document.querySelector<HTMLTextAreaElement>('#preview-props')?.value,
      ).toContain('Grace');
      expect(
        document.querySelector<HTMLInputElement>('#test-send-subject')?.value,
      ).toBe('Welcome Grace');
    });

    let editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.value = '["not", "an", "object"]';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document
      .querySelector<HTMLButtonElement>('[data-action="apply-props"]')
      ?.click();

    expect(document.querySelector('#props-error')?.textContent).toContain(
      'must be a JSON object',
    );
    expect(harness.renderRequests).toHaveLength(2);

    editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.value = '{"name":';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document
      .querySelector<HTMLButtonElement>('[data-action="apply-props"]')
      ?.click();
    expect(document.querySelector('#props-error')?.textContent).toContain(
      'Enter valid JSON',
    );

    editor = getElement<HTMLTextAreaElement>('#preview-props');
    editor.value = '{"name":"Lin","plan":"Pro"}';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document
      .querySelector<HTMLButtonElement>('[data-action="apply-props"]')
      ?.click();

    await vi.waitFor(() => {
      expect(harness.renderRequests.at(-1)).toEqual({
        id: 'welcome',
        variant: 'reminder',
        props: { name: 'Lin', plan: 'Pro' },
      });
      expect(document.querySelector('.unsaved')).toBeNull();
    });

    harness.application.destroy();
  }, 15_000);

  it('surfaces rendered-email lint findings with severity and guidance', async () => {
    const harness = createHarness();
    await harness.application.start();

    expect(document.querySelector('.lint-summary')?.textContent).toContain(
      '2 issues',
    );
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
    expect(
      document.querySelector<HTMLAnchorElement>('.lint-panel a')?.href,
    ).toBe('https://www.caniemail.com/features/css-display-grid/');

    harness.application.destroy();
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

    document
      .querySelector<HTMLButtonElement>('[data-action="download"]')
      ?.click();
    expect(harness.downloadText).toHaveBeenCalledWith(
      expect.stringContaining('<h1>Hello</h1>'),
      'welcome-email.html',
      'text/html;charset=utf-8',
    );

    const htmlTab = getElement<HTMLButtonElement>('[data-tab="html"]');
    htmlTab.click();
    expect(document.querySelector('.code-heading')?.textContent).toContain(
      'Rendered HTML',
    );
    document.querySelector<HTMLButtonElement>('[data-action="copy"]')?.click();

    await vi.waitFor(() => {
      expect(harness.copyText).toHaveBeenCalledWith(
        expect.stringContaining('<h1>Hello</h1>'),
      );
    });
    expect(
      document.querySelector('[data-action="copy"]')?.textContent,
    ).toContain('Copied');

    const currentHtmlTab = getElement<HTMLButtonElement>('[data-tab="html"]');
    currentHtmlTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    );
    await flush();

    expect(
      document
        .querySelector<HTMLButtonElement>('[data-tab="text"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(document.activeElement?.getAttribute('data-tab')).toBe('text');
    expect(document.querySelector('.code-heading')?.textContent).toContain(
      'Plain text',
    );

    document
      .querySelector<HTMLButtonElement>('[data-action="download"]')
      ?.click();
    expect(harness.downloadText).toHaveBeenCalledWith(
      'Hello from the plain-text email.',
      'welcome-email.txt',
      'text/plain;charset=utf-8',
    );

    document.querySelector<HTMLButtonElement>('[data-action="copy"]')?.click();
    await vi.waitFor(() => {
      expect(harness.copyText).toHaveBeenLastCalledWith(
        'Hello from the plain-text email.',
      );
    });

    const textTab = getElement<HTMLButtonElement>('[data-tab="text"]');
    textTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'End' }),
    );
    await flush();
    expect(document.activeElement?.getAttribute('data-tab')).toBe('source');

    document
      .querySelector<HTMLButtonElement>('[data-action="download"]')
      ?.click();
    expect(harness.downloadText).toHaveBeenLastCalledWith(
      'export default function WelcomeEmail() { return <Html />; }',
      'welcome-email.tsx',
      'text/plain;charset=utf-8',
    );

    const sourceTab = getElement<HTMLButtonElement>('[data-tab="source"]');
    sourceTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }),
    );
    await flush();
    expect(document.activeElement?.getAttribute('data-tab')).toBe('preview');

    const previewTab = getElement<HTMLButtonElement>('[data-tab="preview"]');
    previewTab.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }),
    );
    await flush();
    expect(document.activeElement?.getAttribute('data-tab')).toBe('source');

    document.querySelector<HTMLButtonElement>('[data-action="copy"]')?.click();
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

    document
      .querySelector<HTMLButtonElement>('[data-action="download"]')
      ?.click();

    expect(document.querySelector('.error-banner')?.textContent).toContain(
      'Downloads are blocked.',
    );
    expect(document.querySelector('#email-preview-frame')).not.toBeNull();

    harness.application.destroy();
  });

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
    remoteImages.checked = true;
    remoteImages.dispatchEvent(new Event('change', { bubbles: true }));

    const iframe = document.querySelector<HTMLIFrameElement>(
      '#email-preview-frame',
    );
    expect(iframe?.srcdoc).toContain('img-src https: http: data: blob:');
    expect(iframe?.getAttribute('sandbox')).toBe('');

    harness.application.destroy();
  });

  it('persists the workspace theme independently from the email preview mode', async () => {
    const harness = createHarness();
    await harness.application.start();

    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    getElement<HTMLButtonElement>(
      '[data-action="toggle-workspace-color-mode"]',
    ).click();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(
      window.localStorage.getItem('chakra-email.preview.workspace-color-mode'),
    ).toBe('dark');
    expect(
      document
        .querySelector('button[data-email-color-mode="system"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');

    harness.application.destroy();
  });

  it('explains ambiguous controls with accessible tooltips', async () => {
    const harness = createHarness();
    await harness.application.start();

    const themeToggle = getElement<HTMLButtonElement>(
      '[data-action="toggle-workspace-color-mode"]',
    );
    themeToggle.focus();

    await vi.waitFor(
      () => {
        expect(
          document.querySelector('[data-scope="tooltip"][data-part="content"]')
            ?.textContent,
        ).toContain('Switch the app to the dark workspace theme');
      },
      { timeout: 2_000 },
    );

    themeToggle.blur();
    await new Promise((resolve) => window.setTimeout(resolve, 150));

    const fitViewport = getElement<HTMLButtonElement>(
      '[data-viewport="fluid"]',
    );
    fitViewport.focus();

    await vi.waitFor(
      () => {
        expect(
          [...document.querySelectorAll('[data-scope="tooltip"]')].some(
            (element) =>
              element.textContent?.includes(
                'Fit the email preview to the available workspace',
              ),
          ),
        ).toBe(true);
      },
      { timeout: 2_000 },
    );

    expect(themeToggle.getAttribute('title')).toBeNull();
    expect(themeToggle.getAttribute('aria-label')).toBe(
      'Use dark workspace theme',
    );

    harness.application.destroy();
  });

  it('forces the rendered email color mode while preserving a system option', async () => {
    const harness = createHarness();
    await harness.application.start();

    getElement<HTMLButtonElement>('[data-email-color-mode="dark"]').click();

    let iframe = getElement<HTMLIFrameElement>('#email-preview-frame');
    expect(iframe.dataset['emailColorMode']).toBe('dark');
    expect(iframe.style.colorScheme).toBe('only dark');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: dark)');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: light)');
    expect(iframe.srcdoc).not.toContain('data-chakra-email-preview-color-mode');
    expect(
      window.localStorage.getItem('chakra-email.preview.email-color-mode'),
    ).toBe('dark');

    getElement<HTMLButtonElement>('[data-email-color-mode="system"]').click();

    iframe = getElement<HTMLIFrameElement>('#email-preview-frame');
    expect(iframe.style.colorScheme).toBe('light dark');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: dark)');
    expect(iframe.srcdoc).toContain('(prefers-color-scheme: light)');

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
    expect(document.querySelector('.connection')?.textContent).toContain(
      'Live',
    );

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
    expect(document.querySelector('.connection')?.textContent).toContain(
      'Reconnecting',
    );

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

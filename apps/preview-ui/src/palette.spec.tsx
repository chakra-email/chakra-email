import { ChakraProvider } from '@chakra-ui/react';
import axe from 'axe-core';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreviewPalette, type PreviewPaletteProps } from './palette';
import { createPreviewSystem } from './theme';

const roots: Root[] = [];
const system = createPreviewSystem();
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

function mount(overrides: Partial<PreviewPaletteProps['state']> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  const opener = document.createElement('input');
  opener.setAttribute('aria-label', 'Original opener');
  document.body.append(opener);
  opener.focus();
  const props: PreviewPaletteProps = {
    state: {
      paletteOpen: true,
      templates: [
        {
          id: 'welcome',
          name: 'Welcome',
          group: 'Account',
          path: 'account/welcome.tsx',
        },
        {
          id: 'receipt',
          name: 'Receipt',
          group: 'Billing',
          path: 'billing/receipt.tsx',
        },
      ],
      selectedId: 'welcome',
      result: {
        id: 'welcome',
        name: 'Welcome',
        html: '<p>Hello</p>',
        text: 'Hello',
        source: '',
        subject: 'Welcome',
        props: {},
        variants: [],
        lint: [],
      },
      activeTab: 'preview',
      viewport: 'desktop',
      emailColorMode: 'light',
      remoteImages: false,
      templatesOpen: true,
      inspectorOpen: true,
      workspaceColorMode: 'system',
      canTestSend: true,
      sending: false,
      canCheckLinks: true,
      checkingLinks: false,
      canOpenInEditor: true,
      openingEditor: false,
      rendering: false,
      propsDirty: false,
      propsError: null,
      ...overrides,
    },
    returnFocusRef: { current: opener },
    onSelectTemplate: vi.fn(),
    onTabChange: vi.fn(),
    onViewportChange: vi.fn(),
    onToggleEmailColorMode: vi.fn(),
    onRemoteImagesChange: vi.fn(),
    onPanelChange: vi.fn((key, open) => {
      props.state = { ...props.state, [key]: open };
      render();
    }),
    onPreferenceChange: vi.fn(),
    onCopy: vi.fn(),
    onDownload: vi.fn(),
    onOpenInEditor: vi.fn(),
    onCheckLinks: vi.fn(),
    onOpenSendTest: vi.fn(),
  };
  const render = () =>
    flushSync(() =>
      root.render(
        <ChakraProvider value={system}>
          <PreviewPalette {...props} />
        </ChakraProvider>,
      ),
    );
  render();
  return {
    props,
    opener,
    render,
    update: (state: Partial<PreviewPaletteProps['state']>) => {
      props.state = { ...props.state, ...state };
      render();
    },
  };
}

function input() {
  const element = document.querySelector<HTMLInputElement>(
    '[aria-label="Find a command"]',
  );
  if (!element) throw new Error('Missing command query');
  return element;
}
function query(value: string) {
  const element = input();
  flushSync(() => {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function key(value: string) {
  flushSync(() =>
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key: value, bubbles: true }),
    ),
  );
}
function option(label: string) {
  const element = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((item) => item.getAttribute('aria-label')?.split(',')[0] === label);
  if (!element) throw new Error('Missing command: ' + label);
  return element;
}
function activeLabel() {
  const active = document.getElementById(
    input().getAttribute('aria-activedescendant') ?? '',
  );
  return active?.getAttribute('aria-label');
}

describe('PreviewPalette', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    // Focus-trap correctly ignores layout-hidden nodes; JSDOM has no layout.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      { width: 100, height: 20 },
    ] as unknown as DOMRectList);
  });
  afterEach(() => {
    roots.splice(0).forEach((root) => flushSync(() => root.unmount()));
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalScrollIntoView)
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  });

  it('groups commands into the five sections and searches template groups and paths', () => {
    mount();
    expect(
      Array.from(document.querySelectorAll('[role="group"]')).map(
        (group) =>
          document.getElementById(group.getAttribute('aria-labelledby') ?? '')
            ?.textContent,
      ),
    ).toEqual(['Templates', 'View', 'Preview', 'Workspace', 'Actions']);
    expect(option('Welcome').textContent).toContain(
      'Account · account/welcome.tsx',
    );
    expect(document.querySelector('[role="option"] button')).toBeNull();
    query('  BILLING/RECEIPT  ');
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
    expect(activeLabel()).toContain('Receipt');
    query('account');
    expect(activeLabel()).toContain('Welcome');
  });

  it('exposes a named grouped listbox without accessibility violations', async () => {
    mount();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) throw new Error('Missing command dialog');
    const report = await axe.run(dialog, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(report.violations).toEqual([]);
  });

  it.each([
    ['Welcome', 'onSelectTemplate', 'welcome'],
    ['View: Preview', 'onTabChange', 'preview'],
    ['View: Compare', 'onTabChange', 'compare'],
    ['View: HTML', 'onTabChange', 'html'],
    ['View: Text', 'onTabChange', 'text'],
    ['View: Source', 'onTabChange', 'source'],
    ['Desktop preview', 'onViewportChange', 'desktop'],
    ['Mobile preview', 'onViewportChange', 'mobile'],
    ['Remote images: On', 'onRemoteImagesChange', true],
    ['Remote images: Off', 'onRemoteImagesChange', false],
    ['Copy HTML', 'onCopy', 'html'],
    ['Download .eml', 'onDownload', 'eml'],
  ] as const)(
    'runs %s through its application callback',
    (label, callback, value) => {
      const { props } = mount();
      flushSync(() => option(label).click());
      expect(props[callback]).toHaveBeenCalledWith(value);
      expect(props.onPanelChange).toHaveBeenCalledWith('paletteOpen', false);
    },
  );

  it.each(['Light client', 'Dark client'])('sets %s idempotently', (label) => {
    const { props, update } = mount();
    flushSync(() => option(label).click());
    expect(props.onToggleEmailColorMode).toHaveBeenCalledTimes(
      label === 'Light client' ? 0 : 1,
    );
    update({
      paletteOpen: true,
      emailColorMode: label === 'Light client' ? 'dark' : 'light',
    });
    flushSync(() => option(label).click());
    expect(props.onToggleEmailColorMode).toHaveBeenCalledTimes(
      label === 'Light client' ? 1 : 2,
    );
  });

  it('toggles workspace panels and selects each interface theme', () => {
    const { props, update } = mount();
    for (const [label, panel] of [
      ['Toggle sidebar', 'templatesOpen'],
      ['Toggle inspector', 'inspectorOpen'],
    ] as const) {
      update({ paletteOpen: true });
      flushSync(() => option(label).click());
      expect(props.onPanelChange).toHaveBeenCalledWith(panel, false);
    }
    for (const mode of ['System', 'Light', 'Dark']) {
      update({ paletteOpen: true });
      flushSync(() => option('Interface theme: ' + mode).click());
      expect(props.onPreferenceChange).toHaveBeenCalledWith(
        'workspaceColorMode',
        mode.toLowerCase(),
      );
    }
  });

  it('hides unavailable capabilities and disables render-dependent actions before a render', () => {
    mount({
      canTestSend: false,
      canCheckLinks: false,
      canOpenInEditor: false,
      result: null,
      selectedId: null,
    });
    const text = document.querySelector('[role="listbox"]')?.textContent;
    expect(text).not.toContain('Send test');
    expect(text).not.toContain('Check links');
    expect(text).not.toContain('Open in editor');
    expect(option('Copy HTML').getAttribute('aria-disabled')).toBe('true');
    expect(option('Download .eml').getAttribute('aria-disabled')).toBe('true');
  });

  it.each([
    { sending: true },
    { rendering: true },
    { propsDirty: true },
    { propsError: 'Invalid JSON' },
    { result: null },
    { selectedId: 'receipt' },
  ])('does not run a Send test action while unavailable: %j', (state) => {
    const { props } = mount(state);
    query('Send test');
    expect(option('Send test').getAttribute('aria-disabled')).toBe('true');
    key('Enter');
    flushSync(() => option('Send test').click());
    expect(props.onOpenSendTest).not.toHaveBeenCalled();
    expect(props.onPanelChange).not.toHaveBeenCalled();
  });

  it('runs editor and link checks only when ready, including changes while open', () => {
    const { props, update } = mount({
      checkingLinks: true,
      openingEditor: true,
    });
    flushSync(() => option('Check links').click());
    flushSync(() => option('Open in editor').click());
    expect(props.onCheckLinks).not.toHaveBeenCalled();
    expect(props.onOpenInEditor).not.toHaveBeenCalled();
    update({ checkingLinks: false, openingEditor: false });
    flushSync(() => option('Check links').click());
    expect(props.onCheckLinks).toHaveBeenCalledOnce();
    update({ paletteOpen: true });
    flushSync(() => option('Open in editor').click());
    expect(props.onOpenInEditor).toHaveBeenCalledOnce();
  });

  it('moves with arrows/Home/End, wraps, scrolls the active result and runs Enter', () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    const { props } = mount({
      templates: Array.from({ length: 40 }, (_, index) => ({
        id: String(index),
        name: 'Template ' + String(index).padStart(2, '0'),
      })),
    });
    query('Template');
    key('End');
    expect(activeLabel()).toBe('Template 39');
    expect(scroll).toHaveBeenLastCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
    key('ArrowDown');
    expect(activeLabel()).toBe('Template 00');
    key('ArrowUp');
    expect(activeLabel()).toBe('Template 39');
    key('Home');
    key('ArrowDown');
    expect(activeLabel()).toBe('Template 01');
    key('Enter');
    expect(props.onSelectTemplate).toHaveBeenCalledWith('1');
  });

  it('does not intercept IME confirmation or navigation keys', () => {
    const { props } = mount();
    query('View: HTML');
    for (const key of ['Enter', 'ArrowDown', 'Home', 'End']) {
      const event = new KeyboardEvent('keydown', {
        key,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      });
      flushSync(() => input().dispatchEvent(event));
      expect(event.defaultPrevented).toBe(false);
    }
    expect(props.onTabChange).not.toHaveBeenCalled();
    expect(props.onPanelChange).not.toHaveBeenCalled();
    key('Enter');
    expect(props.onTabChange).toHaveBeenCalledWith('html');
  });

  it('keeps empty results open and never runs an unrelated command on Enter', () => {
    const { props } = mount();
    query('no-such-command');
    for (const name of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'])
      key(name);
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      'No matching commands',
    );
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
    expect(props.onPanelChange).not.toHaveBeenCalled();
    query('View: HTML');
    key('Enter');
    expect(props.onTabChange).toHaveBeenCalledWith('html');
  });

  it('restores the actual opener on Escape and resets the query when reopened', async () => {
    const { opener, props, update } = mount();
    await vi.waitFor(() => expect(document.activeElement).toBe(input()));
    query('Billing');
    key('Escape');
    await vi.waitFor(() =>
      expect(props.onPanelChange).toHaveBeenCalledWith('paletteOpen', false),
    );
    await vi.waitFor(() => expect(document.activeElement).toBe(opener));
    update({ paletteOpen: true });
    await vi.waitFor(() => expect(input().value).toBe(''));
    expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(
      1,
    );
  });

  it('hands focus to Send test after the modal exits rather than restoring its opener', async () => {
    const { props, opener } = mount();
    const recipient = document.createElement('input');
    document.body.append(recipient);
    props.onOpenSendTest = vi.fn(() => recipient.focus());
    query('Send test');
    key('Enter');
    await vi.waitFor(() => expect(props.onOpenSendTest).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(document.activeElement).toBe(recipient));
    expect(document.activeElement).not.toBe(opener);
  });
});

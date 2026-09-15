import {
  createContext,
  createElement,
  useContext,
  type CSSProperties,
  type ReactElement,
} from 'react';
import type { EmailColorMode } from '../theme/types.js';
import { stylesToInlineString } from './email-safe.js';

export interface EmailColorModeRender {
  mode: EmailColorMode;
  rules: Map<string, string>;
}

const ColorModeRenderContext = createContext<EmailColorModeRender | undefined>(
  undefined,
);
const modeStyles = new WeakMap<
  CSSProperties,
  { dark: CSSProperties; render: EmailColorModeRender }
>();

export function useEmailColorModeRender(): EmailColorModeRender | undefined {
  return useContext(ColorModeRenderContext);
}

/** Adapter hook: one isolated style collector per render, never a second React render. */
export function createEmailColorModeRender(
  element: ReactElement,
  mode: EmailColorMode = 'system',
) {
  if (!['system', 'light', 'dark'].includes(mode))
    throw new TypeError('Invalid email color mode.');
  const render: EmailColorModeRender = { mode, rules: new Map() };
  return {
    element: createElement(
      ColorModeRenderContext.Provider,
      { value: render },
      element,
    ),
    finish(html: string): string {
      const rules = [...render.rules]
        .map(([declarations, className]) => `.${className}{${declarations}}`)
        .join('');
      if (!rules) return html;
      const css = `<style data-chakra-email-color-mode="system">@media (prefers-color-scheme: dark){${rules}}</style>`;
      // Honor explicit metadata supplied by templates.
      const metadata = /<meta\b[^>]*name=["']color-scheme["']/iu.test(html)
        ? ''
        : '<meta name="color-scheme" content="light dark"/><meta name="supported-color-schemes" content="light dark"/>';
      if (/<\/head\s*>/iu.test(html))
        return html.replace(/<\/head\s*>/iu, () => `${metadata}${css}</head>`);
      if (/<html\b[^>]*>/iu.test(html))
        return html.replace(
          /<html\b[^>]*>/iu,
          (tag) => `${tag}<head>${metadata}${css}</head>`,
        );
      return `${css}${html}`;
    },
  };
}

export function withEmailDarkStyles(
  light: CSSProperties,
  dark: CSSProperties,
  render?: EmailColorModeRender,
): CSSProperties {
  if (render) modeStyles.set(light, { dark, render });
  return light;
}

export function emailDarkStyles(
  styles: CSSProperties | undefined,
): CSSProperties | undefined {
  return styles ? (modeStyles.get(styles)?.dark ?? styles) : undefined;
}

export function emailStyleRender(
  styles: CSSProperties | undefined,
): EmailColorModeRender | undefined {
  return styles ? modeStyles.get(styles)?.render : undefined;
}

/** Apply component-derived table/border corrections to both mode snapshots. */
export function updateEmailStyleModes(
  styles: CSSProperties,
  update: (styles: CSSProperties) => void,
): void {
  const dark = modeStyles.get(styles)?.dark;
  if (dark) update(dark);
  update(styles);
}

/** Use with styles returned by Chakra Email hooks in custom native elements. */
export function getEmailStyleProps(
  style: CSSProperties,
  className?: string,
): { style: CSSProperties; className?: string } {
  const metadata = modeStyles.get(style);
  if (
    !metadata ||
    Object.keys({ ...style, ...metadata.dark }).every(
      (key) =>
        style[key as keyof CSSProperties] ===
        metadata.dark[key as keyof CSSProperties],
    )
  ) {
    return { style, ...(className ? { className } : {}) };
  }
  // Full declarations retain shorthand/longhand order. Reject CSS breakout
  // punctuation before emitting any authored values inside a style element.
  const emitted = { ...metadata.dark };
  for (const [property, value] of Object.entries(emitted)) {
    if (
      !/^[a-zA-Z][a-zA-Z0-9]*$/u.test(property) ||
      (typeof value === 'string' &&
        (/[;{}<>]/u.test(value) ||
          Array.from(value).some((char) => char.charCodeAt(0) < 32)))
    ) {
      if (style[property as keyof CSSProperties] !== value)
        throw new TypeError('Unsafe CSS value in email color-mode styles.');
      // Unchanged authored inline values remain safely React-escaped; do not
      // promote them into stylesheet syntax merely because another value changed.
      delete emitted[property as keyof CSSProperties];
    }
  }
  const declarations = stylesToInlineString(emitted)
    .split('; ')
    .filter(Boolean)
    .map((declaration) => `${declaration} !important`)
    .join(';');
  let generated = metadata.render.rules.get(declarations);
  if (!generated) {
    generated = `ce-mode-${metadata.render.rules.size}`;
    metadata.render.rules.set(declarations, generated);
  }
  return { style, className: [className, generated].filter(Boolean).join(' ') };
}

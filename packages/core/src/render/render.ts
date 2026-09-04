import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  EmailSecurityPolicyProvider,
  type EmailSecurityPolicy,
} from '../security/index.js';
import { pretty as prettyHtml } from './pretty.js';
import { toPlainText, type PlainTextOptions } from './text.js';

const emailDoctype =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
const linkElementPattern = /<link\b[^>]*>/giu;

export interface RenderOptions {
  pretty?: boolean;
  plainText?: boolean;
  plainTextOptions?: PlainTextOptions;
  urlPolicy?: EmailSecurityPolicy;
}

export interface RenderEmailOptions {
  pretty?: boolean;
  plainTextOptions?: PlainTextOptions;
  urlPolicy?: EmailSecurityPolicy;
}

export interface RenderPlainTextOptions extends PlainTextOptions {
  urlPolicy?: EmailSecurityPolicy;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

export interface EmailRenderer {
  render(
    element: ReactElement,
    options?: RenderEmailOptions,
  ): Promise<RenderedEmail>;
}

function withEmailDoctype(html: string): string {
  if (/^\s*<!doctype/i.test(html)) {
    return html;
  }

  return `${emailDoctype}${html}`;
}

function hasAttribute(tag: string, name: string, value: string): boolean {
  return new RegExp(
    `\\s${name}\\s*=\\s*(?:"${value}"|'${value}'|${value})(?=\\s|/?>)`,
    'iu',
  ).test(tag);
}

/** React 19 emits browser-only resource hints for images during SSR. */
function stripImagePreloadHints(html: string): string {
  return html.replace(linkElementPattern, (tag) =>
    hasAttribute(tag, 'rel', 'preload') && hasAttribute(tag, 'as', 'image')
      ? ''
      : tag,
  );
}

function renderMarkup(
  element: ReactElement,
  urlPolicy?: EmailSecurityPolicy,
): string {
  const renderable = urlPolicy
    ? createElement(EmailSecurityPolicyProvider, {
        policy: urlPolicy,
        children: element,
      })
    : element;
  return withEmailDoctype(
    stripImagePreloadHints(renderToStaticMarkup(renderable)),
  );
}

export async function render(
  element: ReactElement,
  options: RenderOptions = {},
): Promise<string> {
  const html = renderMarkup(element, options.urlPolicy);
  const output = options.pretty ? prettyHtml(html) : html;

  if (options.plainText) {
    return toPlainText(output, options.plainTextOptions);
  }

  return output;
}

export async function renderEmail(
  element: ReactElement,
  options: RenderEmailOptions = {},
): Promise<RenderedEmail> {
  const rendered = renderMarkup(element, options.urlPolicy);

  return {
    html: options.pretty ? prettyHtml(rendered) : rendered,
    text: toPlainText(rendered, options.plainTextOptions),
  };
}

export async function renderPlainText(
  element: ReactElement,
  options: RenderPlainTextOptions = {},
): Promise<string> {
  const { urlPolicy, ...plainTextOptions } = options;
  return toPlainText(renderMarkup(element, urlPolicy), plainTextOptions);
}

export const chakraEmailRenderer: EmailRenderer = {
  render: renderEmail,
};

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { pretty as prettyHtml } from './pretty.js';
import { toPlainText } from './text.js';

const emailDoctype =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

export interface RenderOptions {
  pretty?: boolean;
  plainText?: boolean;
}

function withEmailDoctype(html: string): string {
  if (/^\s*<!doctype/i.test(html)) {
    return html;
  }

  return `${emailDoctype}${html}`;
}

export async function render(
  element: ReactElement,
  options: RenderOptions = {}
): Promise<string> {
  const html = withEmailDoctype(renderToStaticMarkup(element));
  const output = options.pretty ? prettyHtml(html) : html;

  if (options.plainText) {
    return toPlainText(output);
  }

  return output;
}

export async function renderPlainText(element: ReactElement): Promise<string> {
  return toPlainText(withEmailDoctype(renderToStaticMarkup(element)));
}

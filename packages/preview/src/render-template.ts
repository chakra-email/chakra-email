import { readFile } from 'node:fs/promises';
import { chakraEmailRenderer, type EmailRenderer } from '@chakra-email/core';
import {
  cloneElement,
  createElement,
  isValidElement,
  type ElementType,
  type ReactElement,
} from 'react';
import type { JsonObject, JsonValue } from './config.js';
import type { PreviewRenderResponse } from './protocol.js';
import type { RegisteredTemplate } from './discovery.js';
import { lintRenderedEmail } from './lint-email.js';

export type TemplateModule = Record<string, unknown> & { default?: unknown };

export interface RenderTemplateOptions {
  module: TemplateModule;
  props?: unknown;
  renderer?: EmailRenderer;
  template: RegisteredTemplate;
  variant?: string;
}

function cloneJsonValue(
  value: unknown,
  label: string,
  seen: Set<unknown>,
  depth = 0,
): JsonValue {
  if (depth > 20) {
    throw new Error(`${label} exceeds the maximum JSON depth.`);
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} contains a non-finite number.`);
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new Error(`${label} must contain only JSON-safe values.`);
  }
  if (seen.has(value)) {
    throw new Error(`${label} must not contain circular references.`);
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) =>
        cloneJsonValue(entry, label, seen, depth + 1),
      );
    }
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${label} must contain only plain objects.`);
    }
    const output: JsonObject = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`${label} contains a reserved key.`);
      }
      output[key] = cloneJsonValue(entry, label, seen, depth + 1);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

export function normalizeJsonObject(value: unknown, label: string): JsonObject {
  if (value === undefined) {
    return {};
  }
  const normalized = cloneJsonValue(value, label, new Set());
  if (
    Array.isArray(normalized) ||
    normalized === null ||
    typeof normalized !== 'object'
  ) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return normalized;
}

function getComponentPreviewProps(component: unknown): unknown {
  if (
    (typeof component === 'function' || typeof component === 'object') &&
    component
  ) {
    return (component as { PreviewProps?: unknown }).PreviewProps;
  }
  return undefined;
}

function createTemplateElement(
  component: unknown,
  props: JsonObject,
): ReactElement {
  if (isValidElement(component)) {
    return cloneElement(component as ReactElement<JsonObject>, props);
  }
  if (typeof component !== 'function' && typeof component !== 'object') {
    throw new Error(
      'Template must default-export a React component or element.',
    );
  }
  return createElement(component as ElementType, props);
}

export async function renderTemplate(
  options: RenderTemplateOptions,
): Promise<PreviewRenderResponse> {
  const component = options.module.default;
  if (!component) {
    throw new Error('Template must have a default export.');
  }

  const baseProps = normalizeJsonObject(
    options.module.previewProps ?? getComponentPreviewProps(component),
    'previewProps',
  );
  const variants = normalizeJsonObject(
    options.module.previewVariants,
    'previewVariants',
  );
  const variantNames = Object.keys(variants).sort((left, right) =>
    left.localeCompare(right),
  );
  let variantProps: JsonObject = {};
  if (options.variant) {
    if (!(options.variant in variants)) {
      throw new Error(`Unknown preview variant: ${options.variant}`);
    }
    variantProps = normalizeJsonObject(
      variants[options.variant],
      `previewVariants.${options.variant}`,
    );
  }
  const customProps = normalizeJsonObject(options.props, 'props');
  const props = { ...baseProps, ...variantProps, ...customProps };
  const element = createTemplateElement(component, props);
  const renderer = options.renderer ?? chakraEmailRenderer;
  const [output, source] = await Promise.all([
    renderer.render(element, { pretty: true }),
    readFile(options.template.absolutePath, 'utf8'),
  ]);
  const { html, text } = output;

  return {
    html,
    id: options.template.id,
    lint: lintRenderedEmail(html, text),
    name: options.template.name,
    props,
    source,
    text,
    variants: variantNames,
  };
}

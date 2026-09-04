import { Fragment, type ReactNode } from 'react';
import {
  EmailRenderError,
  sanitizeEmailUrl,
  type EmailUrlKind,
  type EmailUrlPolicy,
} from '@chakra-email/core/security';
import type {
  Components,
  Options as ReactMarkdownOptions,
} from 'react-markdown';
import remarkDirective from 'remark-directive';

export type MarkdownDirectiveKind = 'container' | 'leaf' | 'text';
export type MarkdownDirectiveChildren = 'none' | 'optional' | 'required';

interface MarkdownDirectiveAttributeBase {
  required?: boolean;
}

export interface MarkdownDirectiveStringAttribute extends MarkdownDirectiveAttributeBase {
  type: 'string';
  maxBytes: number;
}

export interface MarkdownDirectiveEnumAttribute extends MarkdownDirectiveAttributeBase {
  type: 'enum';
  values: readonly string[];
}

export interface MarkdownDirectiveBooleanAttribute extends MarkdownDirectiveAttributeBase {
  type: 'boolean';
}

export interface MarkdownDirectiveUrlAttribute extends MarkdownDirectiveAttributeBase {
  type: 'url';
  kind?: EmailUrlKind;
  policy?: EmailUrlPolicy;
}

export type MarkdownDirectiveAttribute =
  | MarkdownDirectiveBooleanAttribute
  | MarkdownDirectiveEnumAttribute
  | MarkdownDirectiveStringAttribute
  | MarkdownDirectiveUrlAttribute;

export type MarkdownDirectiveAttributes = Readonly<
  Record<string, boolean | string>
>;

export interface MarkdownDirectiveRenderProps {
  attributes: MarkdownDirectiveAttributes;
  children: ReactNode;
}

export interface MarkdownDirectiveDefinition {
  attributes?: Readonly<Record<string, MarkdownDirectiveAttribute>>;
  children?: MarkdownDirectiveChildren;
  kind: MarkdownDirectiveKind;
  render: (props: MarkdownDirectiveRenderProps) => ReactNode;
}

export type MarkdownDirectiveRegistry = Readonly<
  Record<string, MarkdownDirectiveDefinition>
>;

interface DirectiveNode {
  attributes?: Record<string, string | null | undefined>;
  children?: DirectiveNode[];
  data?: Record<string, unknown>;
  name?: string;
  type?: string;
}

interface DirectiveElementProps {
  children?: ReactNode;
  directiveAttributes?: string;
  directiveName?: string;
}

const directiveElementName = 'chakra-email-directive';
const directiveNodeTypes = new Map<string, MarkdownDirectiveKind>([
  ['containerDirective', 'container'],
  ['leafDirective', 'leaf'],
  ['textDirective', 'text'],
]);

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function directiveError(reason: string): never {
  throw new EmailRenderError(
    'INVALID_COMPONENT_PROP',
    'Markdown directive validation failed.',
    { details: { reason } },
  );
}

function validatePositiveInteger(value: number, reason: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    directiveError(reason);
  }
}

function validateDefinition(definition: MarkdownDirectiveDefinition): void {
  if (!['container', 'leaf', 'text'].includes(definition.kind)) {
    directiveError('invalid-kind-configuration');
  }
  if (
    definition.children !== undefined &&
    !['none', 'optional', 'required'].includes(definition.children)
  ) {
    directiveError('invalid-children-configuration');
  }

  for (const schema of Object.values(definition.attributes ?? {})) {
    if (schema.type === 'string') {
      validatePositiveInteger(schema.maxBytes, 'invalid-string-limit');
    } else if (schema.type === 'enum') {
      if (
        schema.values.length === 0 ||
        schema.values.some((value) => value.length === 0)
      ) {
        directiveError('invalid-enum-configuration');
      }
    } else if (schema.type !== 'boolean' && schema.type !== 'url') {
      directiveError('invalid-attribute-configuration');
    }
  }
}

function parseBoolean(value: string | null | undefined): boolean {
  if (value === null || value === '' || value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return directiveError('invalid-boolean');
}

function sanitizeAttribute(
  value: string | null | undefined,
  schema: MarkdownDirectiveAttribute,
): boolean | string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (schema.type === 'boolean') {
    return parseBoolean(value);
  }
  if (value === null) {
    directiveError('missing-attribute-value');
  }
  if (schema.type === 'enum') {
    return schema.values.includes(value)
      ? value
      : directiveError('invalid-enum-value');
  }
  if (schema.type === 'string') {
    if (byteLength(value) > schema.maxBytes) {
      directiveError('attribute-too-large');
    }
    return value;
  }

  return sanitizeEmailUrl(value, {
    kind: schema.kind ?? 'link',
    policy: { ...schema.policy, onInvalidUrl: 'throw' },
  });
}

function sanitizeAttributes(
  attributes: DirectiveNode['attributes'],
  definition: MarkdownDirectiveDefinition,
): MarkdownDirectiveAttributes {
  const input = attributes ?? {};
  const schemas = definition.attributes ?? {};
  if (Object.keys(input).some((name) => schemas[name] === undefined)) {
    directiveError('unknown-attribute');
  }

  const output: Record<string, boolean | string> = {};
  for (const [name, schema] of Object.entries(schemas)) {
    const value = sanitizeAttribute(input[name], schema);
    if (value === undefined) {
      if (schema.required) {
        directiveError('missing-required-attribute');
      }
      continue;
    }
    output[name] = value;
  }
  return output;
}

function validateChildren(
  node: DirectiveNode,
  definition: MarkdownDirectiveDefinition,
): void {
  const childCount = node.children?.length ?? 0;
  const behavior = definition.children ?? 'optional';
  if (behavior === 'none' && childCount > 0) {
    directiveError('children-not-allowed');
  }
  if (behavior === 'required' && childCount === 0) {
    directiveError('children-required');
  }
}

function createDirectiveTransformer(registry: MarkdownDirectiveRegistry) {
  for (const definition of Object.values(registry)) {
    validateDefinition(definition);
  }

  return () => (tree: DirectiveNode) => {
    function visit(node: DirectiveNode): void {
      const kind = directiveNodeTypes.get(node.type ?? '');
      if (kind) {
        const definition = registry[node.name ?? ''];
        if (!definition) {
          directiveError('unknown-directive');
        }
        if (definition.kind !== kind) {
          directiveError('unexpected-directive-kind');
        }
        validateChildren(node, definition);
        const attributes = sanitizeAttributes(node.attributes, definition);
        node.data = {
          ...(node.data ?? {}),
          hName: directiveElementName,
          hProperties: {
            directiveName: node.name,
            directiveAttributes: JSON.stringify(attributes),
          },
        };
      }

      for (const child of node.children ?? []) {
        visit(child);
      }
    }

    visit(tree);
  };
}

export function createMarkdownDirectiveSupport(
  registry: MarkdownDirectiveRegistry,
): {
  components: Components;
  remarkPlugins: NonNullable<ReactMarkdownOptions['remarkPlugins']>;
} {
  const DirectiveElement = ({
    children,
    directiveAttributes,
    directiveName,
  }: DirectiveElementProps) => {
    const definition = registry[directiveName ?? ''];
    if (!definition || !directiveAttributes) {
      directiveError('invalid-render-state');
    }
    const attributes = JSON.parse(
      directiveAttributes,
    ) as MarkdownDirectiveAttributes;
    return <Fragment>{definition.render({ attributes, children })}</Fragment>;
  };

  return {
    components: {
      [directiveElementName]: DirectiveElement,
    } as Components,
    remarkPlugins: [remarkDirective, createDirectiveTransformer(registry)],
  };
}

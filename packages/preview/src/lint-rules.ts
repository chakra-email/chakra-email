import type {
  PreviewLintFinding,
  PreviewLintRule,
  PreviewLintSeverity,
} from './protocol.js';

export type PreviewLintLevel = PreviewLintSeverity | 'off';
export type PreviewLintOverrides = Readonly<Record<string, PreviewLintLevel>>;
export interface PreviewLintConfig {
  rules?: PreviewLintOverrides;
}
export type LintRuleDefinition = PreviewLintRule;

/** Defaults and passing-condition titles shared by rendering, link checks and future UI/CLI consumers. */
const definitions = {
  'valid-html': {
    category: 'markup',
    title: 'Valid HTML structure',
    severity: 'error',
  },
  'document-doctype': {
    category: 'compatibility',
    title: 'Document type declared',
    severity: 'warning',
  },
  'document-body': {
    category: 'markup',
    title: 'Complete email document',
    severity: 'warning',
  },
  'document-language': {
    category: 'accessibility',
    title: 'Document language declared',
    severity: 'warning',
  },
  'document-title': {
    category: 'accessibility',
    title: 'Descriptive document title',
    severity: 'info',
  },
  'content-type-meta': {
    category: 'compatibility',
    title: 'Character encoding declared',
    severity: 'warning',
  },
  'viewport-meta': {
    category: 'compatibility',
    title: 'Mobile viewport declared',
    severity: 'warning',
  },
  'preview-text': {
    category: 'content',
    title: 'Hidden preview text included',
    severity: 'info',
  },
  'placeholder-text': {
    category: 'content',
    title: 'No placeholder text',
    severity: 'warning',
  },
  'css-border-radius': {
    category: 'compatibility',
    title: 'Rounded buttons include an Outlook fallback',
    severity: 'warning',
  },
  'color-scheme-meta': {
    category: 'compatibility',
    title: 'Color scheme declared',
    severity: 'info',
  },
  'subject-length': {
    category: 'deliverability',
    title: 'Subject fits common inbox previews',
    severity: 'info',
  },
  'preview-text-length': {
    category: 'deliverability',
    title: 'Preview text is 40–150 characters',
    severity: 'info',
  },
  'link-text': {
    category: 'accessibility',
    title: 'Descriptive accessible link text',
    severity: 'info',
  },
  'image-alt': {
    category: 'accessibility',
    title: 'Alternative text on every image',
    severity: 'error',
  },
  'image-dimensions': {
    category: 'compatibility',
    title: 'Image dimensions declared',
    severity: 'info',
  },
  'insecure-url': {
    category: 'deliverability',
    title: 'Secure content and link URLs',
    severity: 'warning',
  },
  'external-stylesheet': {
    category: 'compatibility',
    title: 'No external stylesheets',
    severity: 'warning',
  },
  'css-background-image': {
    category: 'compatibility',
    title: 'No CSS background-image compatibility concerns',
    severity: 'info',
  },
  'css-display-flex': {
    category: 'compatibility',
    title: 'No flexbox layout dependencies',
    severity: 'warning',
  },
  'css-display-grid': {
    category: 'compatibility',
    title: 'No grid layout dependencies',
    severity: 'warning',
  },
  'css-font-face': {
    category: 'compatibility',
    title: 'No web-font dependencies',
    severity: 'info',
  },
  'css-position': {
    category: 'compatibility',
    title: 'No fixed or sticky positioning',
    severity: 'warning',
  },
  'unsupported-script': {
    category: 'compatibility',
    title: 'No unsupported script elements',
    severity: 'error',
  },
  'unsupported-form': {
    category: 'compatibility',
    title: 'No unsupported form elements',
    severity: 'error',
  },
  'unsupported-iframe': {
    category: 'compatibility',
    title: 'No unsupported iframe elements',
    severity: 'error',
  },
  'unsupported-object': {
    category: 'compatibility',
    title: 'No unsupported object elements',
    severity: 'error',
  },
  'unsupported-embed': {
    category: 'compatibility',
    title: 'No unsupported embed elements',
    severity: 'error',
  },
  'unsupported-svg': {
    category: 'compatibility',
    title: 'No unsupported svg elements',
    severity: 'warning',
  },
  'unsupported-video': {
    category: 'compatibility',
    title: 'No unsupported video elements',
    severity: 'warning',
  },
  'unsupported-audio': {
    category: 'compatibility',
    title: 'No unsupported audio elements',
    severity: 'warning',
  },
  'unsupported-button': {
    category: 'compatibility',
    title: 'No unsupported button elements',
    severity: 'warning',
  },
  'plain-text-content': {
    category: 'content',
    title: 'Meaningful plain-text version',
    severity: 'warning',
  },
  'message-size': {
    category: 'deliverability',
    title: 'HTML below the clipping threshold',
    severity: 'warning',
  },
  'link-broken': {
    category: 'links',
    title: 'No broken links',
    severity: 'error',
  },
  'link-redirect': {
    category: 'links',
    title: 'No redirected links',
    severity: 'info',
  },
  'link-unverified': {
    category: 'links',
    title: 'Links verified successfully',
    severity: 'warning',
  },
  'link-skipped': {
    category: 'links',
    title: 'All links eligible for checking',
    severity: 'info',
  },
} as const satisfies Record<string, Omit<LintRuleDefinition, 'id'>>;

export type PreviewLintRuleId = keyof typeof definitions;
export const previewLintRules: readonly Readonly<LintRuleDefinition>[] =
  Object.freeze(
    Object.entries(definitions).map(([id, definition]) =>
      Object.freeze({ id, ...definition }),
    ),
  );

export function isLintRuleId(id: string): id is PreviewLintRuleId {
  return Object.hasOwn(definitions, id);
}

export function getLintRule(
  id: PreviewLintRuleId,
): Readonly<LintRuleDefinition> {
  return { id, ...definitions[id] };
}

export function lintFindingDefaults(
  ruleId: PreviewLintRuleId,
): Pick<PreviewLintFinding, 'ruleId' | 'category' | 'severity'> {
  const { category, severity } = getLintRule(ruleId);
  return { ruleId, category, severity };
}

/** Validate runtime configuration as well as untyped programmatic callers. */
export function normalizeLintRules(value: unknown): PreviewLintOverrides {
  if (value === undefined) return Object.freeze({});
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('lint.rules must be an object of rule severity overrides.');
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error('lint.rules must be an object of rule severity overrides.');
  }
  const rules: Record<string, PreviewLintLevel> = {};
  for (const [id, level] of Object.entries(value)) {
    if (!isLintRuleId(id))
      throw new Error(`Unknown lint rule '${id}' in lint.rules.`);
    if (
      level !== 'off' &&
      level !== 'info' &&
      level !== 'warning' &&
      level !== 'error'
    ) {
      throw new Error(
        `Invalid severity for lint rule '${id}' in lint.rules; expected off, info, warning, or error.`,
      );
    }
    rules[id] = level;
  }
  return Object.freeze(rules);
}

/** The effective catalog excludes disabled rules; neither catalog nor caller config is mutated. */
export function getLintRules(
  overrides?: PreviewLintOverrides,
): PreviewLintRule[] {
  const rules = normalizeLintRules(overrides);
  return previewLintRules.flatMap((rule) => {
    const severity = rules[rule.id] ?? rule.severity;
    return severity === 'off' ? [] : [{ ...rule, severity }];
  });
}

export function resolveLintFinding(
  finding: Omit<PreviewLintFinding, 'category' | 'severity'>,
  overrides: PreviewLintOverrides,
): PreviewLintFinding | undefined {
  if (!isLintRuleId(finding.ruleId))
    throw new Error(`Unregistered lint rule: ${finding.ruleId}`);
  const rule = getLintRule(finding.ruleId);
  const severity = overrides[rule.id] ?? rule.severity;
  return severity === 'off'
    ? undefined
    : { ...finding, category: rule.category, severity };
}

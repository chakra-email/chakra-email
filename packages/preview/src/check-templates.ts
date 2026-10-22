import { createEmailLinkChecker } from './check-links.js';
import type { PreviewConfig } from './config.js';
import {
  renderAllTemplates,
  resolveTemplateConfig,
} from './export-templates.js';
import { normalizeLintRules, type PreviewLintOverrides } from './lint-rules.js';
import type { PreviewLintFinding } from './protocol.js';

export interface CheckTemplatesOptions {
  config?: PreviewConfig;
  configFile?: string;
  cwd?: string;
  includeVariants?: boolean;
  /** Network checks remain opt-in and require configured linkCheck hostnames. */
  checkLinks?: boolean;
  /** Overrides take precedence over the config file. */
  rules?: PreviewLintOverrides;
}

export interface CheckTemplatesResult {
  version: 1;
  summary: {
    templates: number;
    renders: number;
    error: number;
    warning: number;
    info: number;
  };
  results: Array<{
    template: { id: string; path: string };
    variant: string | null;
    findings: PreviewLintFinding[];
  }>;
}

/** Checks local templates without opening a server or sending mail. */
export async function checkTemplates(
  options: CheckTemplatesOptions = {},
): Promise<CheckTemplatesResult> {
  const loadedConfig = await resolveTemplateConfig(options);
  const rules = normalizeLintRules({
    ...loadedConfig.lint?.rules,
    ...normalizeLintRules(options.rules),
  });
  const config = { ...loadedConfig, lint: { rules } };
  if (options.checkLinks && !config.linkCheck) {
    throw new Error('--check-links requires linkCheck in the preview config.');
  }
  const checkLinks =
    options.checkLinks && config.linkCheck
      ? createEmailLinkChecker(config.linkCheck, rules)
      : undefined;
  const report: CheckTemplatesResult = {
    version: 1,
    summary: { templates: 0, renders: 0, error: 0, warning: 0, info: 0 },
    results: [],
  };
  const templateIds = new Set<string>();
  for await (const rendered of renderAllTemplates(config, {
    continueOnError: true,
    includeVariants: options.includeVariants,
  })) {
    templateIds.add(rendered.template.id);
    const findings: PreviewLintFinding[] = rendered.error
      ? [
          {
            category: 'content',
            message: rendered.error.message,
            ruleId: 'render-failed',
            severity: 'error',
            suggestion: 'Fix the template render failure before sending.',
          },
        ]
      : [...rendered.output.lint];
    if (!rendered.error && checkLinks) {
      findings.push(...(await checkLinks(rendered.output.html)).findings);
    }
    findings.sort(
      (left, right) =>
        (left.line ?? 0) - (right.line ?? 0) ||
        (left.column ?? 0) - (right.column ?? 0) ||
        left.ruleId.localeCompare(right.ruleId),
    );
    for (const finding of findings) report.summary[finding.severity]++;
    report.results.push({
      template: { id: rendered.template.id, path: rendered.template.path },
      variant: rendered.variant ?? null,
      findings,
    });
  }
  report.results.sort(
    (left, right) =>
      left.template.path.localeCompare(right.template.path) ||
      (left.variant ?? '').localeCompare(right.variant ?? ''),
  );
  report.summary.templates = templateIds.size;
  report.summary.renders = report.results.length;
  return report;
}

/** A recoverable template failure is an error finding; fatal run failures throw. */
export function checkExitCode(
  report: CheckTemplatesResult,
  strict = false,
): 0 | 1 {
  return report.summary.error > 0 || (strict && report.summary.warning > 0)
    ? 1
    : 0;
}

export function formatCheckReport(
  report: CheckTemplatesResult,
  color = false,
): string {
  const colors = { error: 31, warning: 33, info: 36 } as const;
  const blocks = report.results
    .filter((result) => result.findings.length)
    .map((result) => {
      const lines = result.findings.map((finding) => {
        const severity = finding.severity.padEnd(7);
        const label = color
          ? `\u001b[${colors[finding.severity]}m${severity}\u001b[0m`
          : severity;
        const location =
          finding.line === undefined ? '' : `  HTML ${finding.line}`;
        return `  ${label}  ${finding.ruleId}${location}  ${finding.suggestion}${finding.ruleId === 'render-failed' ? ` (${finding.message})` : ''}`;
      });
      return `${result.template.path}  (${result.variant ?? 'default'})\n${lines.join('\n')}`;
    });
  const { templates, renders, error, warning, info } = report.summary;
  blocks.push(
    `${templates} ${templates === 1 ? 'template' : 'templates'}, ${renders} ${renders === 1 ? 'render' : 'renders'} · ${error} errors · ${warning} warnings · ${info} info`,
  );
  return `${blocks.join('\n\n')}\n`;
}

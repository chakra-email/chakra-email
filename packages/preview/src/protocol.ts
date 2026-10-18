import type { JsonObject } from './config.js';
import type { PreviewCompatibilityReference } from './compatibility.js';

export interface PreviewTemplate {
  group?: string;
  id: string;
  name: string;
  path: string;
}

export interface PreviewTemplatesResponse {
  lintRules?: PreviewLintRule[];
  capabilities: {
    linkCheck?: boolean;
    testSend: boolean;
  };
  templates: PreviewTemplate[];
}

export interface PreviewRenderRequest {
  id: string;
  props?: JsonObject;
  variant?: string;
}

export interface PreviewTestSendRequest extends PreviewRenderRequest {
  subject?: string;
  to: string;
}

export interface PreviewTestSendResponse {
  id?: string;
  message: string;
}

export type PreviewLintSeverity = 'error' | 'warning' | 'info';

export type PreviewLintCategory =
  | 'links'
  | 'accessibility'
  | 'compatibility'
  | 'content'
  | 'deliverability'
  | 'markup';

export interface PreviewLintRule {
  id: string;
  category: PreviewLintCategory;
  /** Passing condition displayed in the checks catalog. */
  title: string;
  severity: PreviewLintSeverity;
}

export interface PreviewLintFinding {
  category: PreviewLintCategory;
  column?: number;
  compatibility?: PreviewCompatibilityReference;
  element?: string;
  line?: number;
  message: string;
  ruleId: string;
  /** Selector matching the affected element in the rendered HTML. */
  selector?: string;
  severity: PreviewLintSeverity;
  suggestion: string;
}

export interface PreviewRenderResponse {
  rulesRun?: string[];
  renderMs?: number;
  linkCheck?: { checked: number; skipped: number };
  html: string;
  id: string;
  lint: PreviewLintFinding[];
  name: string;
  props: JsonObject;
  source: string;
  subject: string;
  text: string;
  variants: string[];
}

export interface PreviewErrorResponse {
  error: {
    message: string;
    stack?: string;
  };
}

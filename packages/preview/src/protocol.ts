import type { JsonObject } from './config.js';

export interface PreviewTemplate {
  id: string;
  name: string;
  path: string;
}

export interface PreviewTemplatesResponse {
  templates: PreviewTemplate[];
}

export interface PreviewRenderRequest {
  id: string;
  props?: JsonObject;
  variant?: string;
}

export type PreviewLintSeverity = 'error' | 'warning' | 'info';

export type PreviewLintCategory =
  | 'accessibility'
  | 'compatibility'
  | 'content'
  | 'deliverability'
  | 'markup';

export interface PreviewLintFinding {
  category: PreviewLintCategory;
  column?: number;
  element?: string;
  line?: number;
  message: string;
  ruleId: string;
  severity: PreviewLintSeverity;
  suggestion: string;
}

export interface PreviewRenderResponse {
  html: string;
  id: string;
  lint: PreviewLintFinding[];
  name: string;
  props: JsonObject;
  source: string;
  text: string;
  variants: string[];
}

export interface PreviewErrorResponse {
  error: {
    message: string;
    stack?: string;
  };
}

export type TemplateLintCounts = {
  error: number;
  warning: number;
  info: number;
};
export type LintSummary = {
  generation: number;
  templates: Array<TemplateLintCounts & { id: string }>;
};

/** SSE payloads are untrusted until their complete generation-tagged summary validates. */
export function parseLintSummary(value: unknown): LintSummary | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined;
  const payload = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(payload.generation) ||
    Number(payload.generation) < 1 ||
    !Array.isArray(payload.templates)
  )
    return undefined;
  const ids = new Set<string>();
  const templates: LintSummary['templates'] = [];
  for (const entry of payload.templates) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      return undefined;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      !row.id ||
      ids.has(row.id) ||
      !(['error', 'warning', 'info'] as const).every(
        (key) => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0,
      )
    )
      return undefined;
    ids.add(row.id);
    templates.push({
      id: row.id,
      error: Number(row.error),
      warning: Number(row.warning),
      info: Number(row.info),
    });
  }
  return { generation: Number(payload.generation), templates };
}

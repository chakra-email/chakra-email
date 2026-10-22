/** Document-order positions match DOMParser's querySelectorAll('a[href]'). */
export interface LinkCheckEntry {
  index: number;
  line?: number;
  column?: number;
  status: 'ok' | 'redirect' | 'broken' | 'skipped' | 'unverified';
  statusCode?: number;
}

/** Validate optional additive metadata before using it to label individual links. */
export function parseLinkCheckEntries(
  value: unknown,
): LinkCheckEntry[] | undefined {
  if (value === undefined) return undefined;
  const invalid = (): never => {
    throw new Error('The preview server returned invalid per-link results.');
  };
  if (!Array.isArray(value)) return invalid();
  const seen = new Set<number>();
  return value.map((entry: unknown) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry))
      return invalid();
    const candidate = entry as Record<string, unknown>;
    const index = candidate['index'];
    const line = candidate['line'];
    const column = candidate['column'];
    const status = candidate['status'];
    const statusCode = candidate['statusCode'];
    if (
      typeof index !== 'number' ||
      !Number.isSafeInteger(index) ||
      index < 0 ||
      seen.has(index) ||
      !['ok', 'redirect', 'broken', 'skipped', 'unverified'].includes(
        status as string,
      )
    )
      return invalid();
    for (const location of [line, column])
      if (
        location !== undefined &&
        (typeof location !== 'number' ||
          !Number.isSafeInteger(location) ||
          location < 1)
      )
        return invalid();
    if (
      statusCode !== undefined &&
      (typeof statusCode !== 'number' ||
        !Number.isInteger(statusCode) ||
        statusCode < 100 ||
        statusCode > 599)
    )
      return invalid();
    if (
      (status === 'ok' &&
        (typeof statusCode !== 'number' ||
          statusCode < 200 ||
          statusCode >= 300)) ||
      (status === 'redirect' &&
        (typeof statusCode !== 'number' ||
          statusCode < 300 ||
          statusCode >= 400)) ||
      (status === 'skipped' && statusCode !== undefined)
    )
      return invalid();
    seen.add(index);
    return {
      index,
      status: status as LinkCheckEntry['status'],
      ...(line !== undefined ? { line: line as number } : {}),
      ...(column !== undefined ? { column: column as number } : {}),
      ...(statusCode !== undefined ? { statusCode: statusCode as number } : {}),
    };
  });
}

/** Missing per-link results never imply success (including with older servers). */
export function formatLinkStatus(entry?: LinkCheckEntry): string {
  if (!entry) return 'not checked';
  switch (entry.status) {
    case 'ok':
      return entry.statusCode === undefined
        ? 'unverified'
        : `${entry.statusCode}`;
    case 'redirect':
      return entry.statusCode === undefined
        ? 'redirect'
        : `→ ${entry.statusCode}`;
    case 'broken':
      return 'broken';
    case 'skipped':
      return 'skipped';
    case 'unverified':
      return entry.statusCode === undefined
        ? 'unverified'
        : `unverified (${entry.statusCode})`;
  }
}

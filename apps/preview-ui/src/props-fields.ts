export type PropsField = {
  path: string[];
  type: 'string' | 'number' | 'boolean' | 'null';
  value: string | boolean;
  error?: string;
};

const reservedKeys = new Set(['__proto__', 'prototype', 'constructor']);

/** A stable model for a fixture or JSON edit, never inferred from a typed field draft. */
export function createPropsFields(text: string): PropsField[] | null {
  const fields: PropsField[] = [];
  const walk = (value: unknown, path: string[]): boolean => {
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) return false;
      const entries = Object.entries(value);
      return (
        entries.length > 0 &&
        entries.every(
          ([key, item]) => !reservedKeys.has(key) && walk(item, [...path, key]),
        )
      );
    }
    if (!path.length || fields.length >= 20) return false;
    const type = value === null ? 'null' : typeof value;
    if (type === 'number' && !Number.isFinite(value)) return false;
    if (!['string', 'number', 'boolean', 'null'].includes(type)) return false;
    fields.push({
      path,
      type: type as PropsField['type'],
      value: typeof value === 'boolean' ? value : String(value ?? ''),
    });
    return true;
  };
  try {
    const props: unknown = JSON.parse(text);
    return props && typeof props === 'object' && walk(props, [])
      ? fields
      : null;
  } catch {
    return null;
  }
}

export function updatePropsField(
  text: string,
  field: PropsField,
  value: string | boolean,
): { text: string; field: PropsField } {
  let parsedValue: string | number | boolean | null = value;
  if (field.type === 'number') {
    // Number('') and Number('0x10') silently coerce invalid JSON number drafts.
    if (
      typeof value !== 'string' ||
      !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(value) ||
      !Number.isFinite(Number(value))
    ) {
      return {
        text,
        field: { ...field, value, error: 'Enter a finite number.' },
      };
    }
    parsedValue = Number(value);
  } else if (field.type === 'null' && value === '') parsedValue = null;
  const draft = JSON.parse(text) as Record<string, unknown>;
  let parent = draft;
  for (const key of field.path.slice(0, -1)) {
    if (reservedKeys.has(key) || !Object.hasOwn(parent, key))
      throw new Error('The props field is no longer available. Edit in JSON.');
    const child = parent[key];
    if (child === null || typeof child !== 'object' || Array.isArray(child))
      throw new Error('The props field is no longer available. Edit in JSON.');
    parent = child as Record<string, unknown>;
  }
  const key = field.path.at(-1);
  if (key === undefined || reservedKeys.has(key) || !Object.hasOwn(parent, key))
    throw new Error('The props field is no longer available. Edit in JSON.');
  Object.defineProperty(parent, key, {
    value: parsedValue,
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return {
    text: JSON.stringify(draft, null, 2),
    field: { ...field, value, error: undefined },
  };
}

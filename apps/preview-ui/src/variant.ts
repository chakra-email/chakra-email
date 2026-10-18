type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function equal(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => equal(value, right[index]))
    );
  }
  if (isObject(left) && isObject(right)) {
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every(
        (key) => Object.hasOwn(right, key) && equal(left[key], right[key]),
      )
    );
  }
  return left === right;
}

function changedProps(base: JsonObject, props: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(props).flatMap(([key, value]) => {
      if (Object.hasOwn(base, key) && equal(base[key], value)) return [];
      return [
        [
          key,
          isObject(base[key]) && isObject(value)
            ? changedProps(base[key], value)
            : value,
        ],
      ];
    }),
  );
}

function quote(value: string): string {
  // JSON escapes controls and newlines; adapt its quoting for a TS single-quoted literal.
  return (
    "'" +
    JSON.stringify(value)
      .slice(1, -1)
      .replace(/\\"/gu, '"')
      .replace(/'/gu, "\\'") +
    "'"
  );
}

function format(value: unknown, depth: number): string {
  if (typeof value === 'string') return quote(value);
  if (Array.isArray(value))
    return value.length
      ? '[\n' +
          value
            .map(
              (item) => '  '.repeat(depth + 1) + format(item, depth + 1) + ',',
            )
            .join('\n') +
          '\n' +
          '  '.repeat(depth) +
          ']'
      : '[]';
  if (isObject(value)) {
    const entries = Object.entries(value);
    return entries.length
      ? '{\n' +
          entries
            .map(
              ([key, item]) =>
                '  '.repeat(depth + 1) +
                (/^[a-zA-Z_$][\w$]*$/u.test(key) ? key : quote(key)) +
                ': ' +
                format(item, depth + 1) +
                ',',
            )
            .join('\n') +
          '\n' +
          '  '.repeat(depth) +
          '}'
      : '{}';
  }
  return JSON.stringify(value);
}

/** A pasteable previewVariants entry; arrays are atomic and objects are deeply diffed. */
export function buildVariantSnippet(
  name: string,
  baseProps: JsonObject,
  props: JsonObject,
): string {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Enter a name for the variant.');
  return (
    quote(trimmedName) +
    ': ' +
    format(changedProps(baseProps, props), 0) +
    ',\n'
  );
}

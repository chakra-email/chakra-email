import { createElement } from 'react';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Box, type BoxProps } from '../components/index';
import { render } from '../render/index';
import { defaultTheme, type EmailTheme } from '../theme/index';
import { mapChakraPropsToStyles, type ChakraEmailStyleProps } from './style-props';

const numRuns = 150;

/**
 * Tricky strings the resolver has to survive: empty, whitespace, numeric
 * strings, token-reference braces (balanced and not), token paths, units,
 * unicode, and CSS-syntax noise. `[object Object]` is deliberately excluded
 * so the "objects never leak as [object Object]" invariant below stays
 * meaningful.
 */
const trickyStrings = fc.constantFrom(
  '',
  '   ',
  '4',
  '-2.5',
  '.5',
  '0',
  'NaN',
  'Infinity',
  '{colors.gray.200}',
  '{colors.missing.token}',
  '{unknown.scale.value}',
  '{}',
  '{',
  '}',
  '}{',
  '{{nested}}',
  '1.5rem',
  '50%',
  'gray.700',
  'brand.500',
  'not.a.token',
  'a;b:c',
  '"quoted"',
  'ⓤⓝⓘⓒⓞⓓⓔ ✓',
  '🎉🎉🎉'
);

const scalarArb = fc.oneof(
  fc.double(),
  fc.integer(),
  fc.constantFrom(
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -0,
    -1,
    1e308,
    -1e308,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER
  ),
  fc.string(),
  fc.string({ unit: 'grapheme', maxLength: 8 }),
  trickyStrings,
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined)
);

const shallowCompositeArb = fc.oneof(
  scalarArb,
  fc.constant([]),
  fc.array(scalarArb, { maxLength: 3 }),
  fc.dictionary(fc.constantFrom('base', 'sm', 'md', '_dark', 'foo'), scalarArb, {
    maxKeys: 3,
  }),
  fc.record({ base: scalarArb })
);

/** Scalars plus nested arrays/objects (with and without a `base` key). */
const styleValueArb = fc.oneof(
  shallowCompositeArb,
  fc.array(shallowCompositeArb, { maxLength: 2 }),
  fc.dictionary(fc.constantFrom('base', 'md', '_dark'), shallowCompositeArb, {
    maxKeys: 2,
  })
);

const propsArb = fc.record(
  {
    p: styleValueArb,
    m: styleValueArb,
    color: styleValueArb,
    bg: styleValueArb,
    fontSize: styleValueArb,
    w: styleValueArb,
    h: styleValueArb,
    border: styleValueArb,
    background: styleValueArb,
  },
  { requiredKeys: [] }
);

const themeArb = fc.record(
  {
    colors: styleValueArb,
    space: styleValueArb,
    spacing: styleValueArb,
    sizes: styleValueArb,
    fontSizes: styleValueArb,
    fontWeights: styleValueArb,
    fonts: styleValueArb,
    lineHeights: styleValueArb,
    radii: styleValueArb,
    borders: styleValueArb,
    tokens: styleValueArb,
    semanticTokens: styleValueArb,
  },
  { requiredKeys: [] }
);

describe('style resolution fuzzing', () => {
  it(
    'mapChakraPropsToStyles never throws for arbitrary prop values',
    () => {
      fc.assert(
        fc.property(propsArb, (props) => {
          const styles = mapChakraPropsToStyles(
            props as ChakraEmailStyleProps,
            defaultTheme
          );

          // Stricter invariants that hold with the default theme: resolved
          // values are always plain strings/numbers (or dropped entirely),
          // object/array inputs never leak as '[object Object]', and numeric
          // outputs are always finite.
          for (const value of Object.values(styles)) {
            if (value === undefined) {
              continue;
            }

            expect(['string', 'number']).toContain(typeof value);
            expect(String(value)).not.toContain('[object Object]');

            if (typeof value === 'number') {
              expect(Number.isFinite(value)).toBe(true);
            }
          }
        }),
        { numRuns }
      );
    },
    30_000
  );

  it(
    'mapChakraPropsToStyles never throws when the theme scales are junk',
    () => {
      fc.assert(
        fc.property(propsArb, themeArb, (props, theme) => {
          // Only the never-throw invariant here: junk scales may legitimately
          // resolve to odd strings, but resolution must not crash.
          mapChakraPropsToStyles(
            props as ChakraEmailStyleProps,
            theme as unknown as EmailTheme
          );
        }),
        { numRuns }
      );
    },
    30_000
  );

  it(
    'render() of a Box with arbitrary style props never rejects',
    async () => {
      await fc.assert(
        fc.asyncProperty(propsArb, async (props) => {
          const html = await render(
            createElement(Box, props as BoxProps, 'fuzz content')
          );

          expect(typeof html).toBe('string');
          expect(html).toContain('fuzz content');
        }),
        { numRuns: 100 }
      );
    },
    60_000
  );
});

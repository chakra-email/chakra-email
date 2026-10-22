import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractQuickstart } from './readme-examples.mjs';

const example = [
  '<!-- quickstart:start -->',
  '',
  '```tsx',
  'export const value = "actual README source";',
  '```',
  '',
  '<!-- quickstart:end -->',
].join('\n');

test('README quick starts are extracted unchanged, including Windows line endings', () => {
  assert.equal(
    extractQuickstart(example, 'README.md'),
    'export const value = "actual README source";\n',
  );
  assert.equal(
    extractQuickstart(example.replaceAll('\n', '\r\n'), 'README.md'),
    'export const value = "actual README source";\r\n',
  );
});

test('README checks fail closed when markers or complete examples go missing', () => {
  for (const markdown of [
    '',
    example + example,
    example.replace('quickstart:start', 'missing'),
    example.replace('quickstart:end', 'missing'),
    '<!-- quickstart:end -->\n<!-- quickstart:start -->\n```tsx\nexport const x = 1;\n```',
    example.replace('```tsx', '```ts'),
    example.replace('export const value = "actual README source";', ''),
    example.replace(
      '<!-- quickstart:end -->',
      '```tsx\nconst x = 1;\n```\n<!-- quickstart:end -->',
    ),
  ]) {
    assert.throws(
      () => extractQuickstart(markdown, 'README.md'),
      /README\.md:/,
    );
  }
});

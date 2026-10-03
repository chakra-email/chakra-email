import './oss-credits.test.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (file) =>
  readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('development and release tooling pin Node 24 and pnpm', () => {
  const manifest = JSON.parse(read('package.json'));
  assert.match(read('.nvmrc').trim(), /^24\.\d+\.\d+$/);
  assert.equal(manifest.packageManager, 'pnpm@11.25.0');
  assert.equal(manifest.engines.node, '>=24 <25');
  for (const file of ['ci.yml', 'pages.yml', 'release.yml']) {
    const source = read('.github/workflows/' + file);
    assert.match(source, /node-version-file: '\.nvmrc'/);
    assert.match(source, /corepack enable/);
    assert.match(source, /pnpm install --frozen-lockfile/);
    assert.doesNotMatch(source, /npm ci|cache: npm/);
  }
  const springbar = read('springbar.toml');
  assert.match(springbar, /package_manager = "pnpm"/);
  assert.ok(springbar.includes(`version = "${read('.nvmrc').trim()}"`));
  assert.match(read('pnpm-workspace.yaml'), /'packages\/\*'/);
  assert.match(read('pnpm-workspace.yaml'), /'apps\/\*'/);
});

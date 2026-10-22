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
  for (const file of ['ci.yml', 'release.yml']) {
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

test('Vercel builds the static site from the workspace without a catch-all rewrite', () => {
  const config = JSON.parse(read('apps/site/vercel.json'));
  assert.equal(config.framework, 'vite');
  assert.equal(
    config.installCommand,
    'cd ../.. && corepack enable && pnpm install --frozen-lockfile',
  );
  assert.equal(config.buildCommand, 'cd ../.. && pnpm run site:build');
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.cleanUrls, true);
  assert.equal(config.trailingSlash, false);
  assert.equal(
    config.rewrites,
    undefined,
    'preserve route-specific HTML and real 404s',
  );
  assert.equal(config.routes, undefined);
  const deployment = read('apps/site/DEPLOYMENT.md');
  assert.match(deployment, /Root Directory.*`apps\/site`/);
  assert.match(deployment, /VITE_FATHOM_SITE_ID/);
  assert.match(deployment, /404\.html/);
});

test('Springbar runs the local email preview with a trusted hostname and assigned port', () => {
  const preview = read('springbar.toml')
    .split('[[unit]]')
    .find((unit) => unit.includes('name = "email-preview"'));
  assert.ok(preview, 'Springbar must include the email-preview unit');
  assert.match(preview, /working_dir = "\."/);
  assert.match(preview, /pnpm nx run chakra-email-monorepo:email-preview/);
  assert.ok(preview.includes('--host 127.0.0.1 --port "$PORT"'));
  assert.match(preview, /hostnames = \["preview\.chakra-email\.test"\]/);
  assert.match(preview, /mode = "lazy"/);
  assert.doesNotMatch(preview, /^port = /m);
  assert.match(
    read('examples/preview/chakra-email.config.ts'),
    /allowedHosts: \['preview\.chakra-email\.test'\]/,
  );
});

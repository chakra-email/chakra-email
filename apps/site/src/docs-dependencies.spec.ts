import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { it } from 'vitest';

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), 'utf8');

it('every locked source-map-js version includes the indexed-map DoS fix', () => {
  const versions = [
    ...read('../../../pnpm-lock.yaml').matchAll(
      /^ {2}source-map-js@(\d+\.\d+\.\d+):/gm,
    ),
  ];
  assert.ok(versions.length > 0);
  for (const [, version] of versions) {
    const [major, minor, patch] = version.split('.').map(Number);
    assert.ok(
      major > 1 || (major === 1 && (minor > 2 || (minor === 2 && patch >= 2))),
      version,
    );
  }
});

it('site analytics uses the pinned public React Fathom release', () => {
  assert.equal(
    JSON.parse(read('../package.json')).dependencies['react-fathom'],
    '0.3.0',
  );
  const lockfile = read('../../../pnpm-lock.yaml');
  assert.doesNotMatch(lockfile, /file:.*\.yalc\/react-fathom/);
  assert.match(lockfile, /react-fathom@0\.3\.0:/);
});

it('the docs site uses pinned published Chakra Docs packages, not local links', () => {
  const manifest = JSON.parse(read('../package.json'));
  const dependencies = Object.entries(manifest.dependencies).filter(([name]) =>
    name.startsWith('@chakra-docs/'),
  );
  assert.ok(dependencies.length >= 4);
  for (const [name, version] of dependencies) {
    assert.equal(version, '0.3.0', name);
  }
  assert.doesNotMatch(
    read('../../../pnpm-lock.yaml'),
    /file:.*\.yalc\/@chakra-docs\//,
  );
});

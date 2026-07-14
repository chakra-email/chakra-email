import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const releaseScript = fileURLToPath(
  new URL('./run-release.mjs', import.meta.url),
);
const packageManifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

function validateReleaseInput(version, overrides = {}) {
  const env = {
    ...process.env,
    RELEASE_DRY_RUN: 'true',
    RELEASE_FIRST_RELEASE: 'false',
    RELEASE_VERSION: version,
    ...overrides,
  };

  if (version === undefined) {
    delete env.RELEASE_VERSION;
  }

  return spawnSync(process.execPath, [releaseScript, '--validate-only'], {
    encoding: 'utf8',
    env,
  });
}

for (const version of [
  'major',
  'minor',
  'patch',
  'prerelease',
  '1.2.3',
  '1.2.3-beta.1+build.7',
]) {
  test(`accepts release version ${version}`, () => {
    const result = validateReleaseInput(version);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), `Validated release version: ${version}`);
  });
}

for (const version of [
  undefined,
  '',
  'v1.2.3',
  '1.2',
  '01.2.3',
  'patch; echo injected',
  '1.2.3 $(echo injected)',
  `1.2.3+${'a'.repeat(129)}`,
]) {
  test(`rejects unsafe or malformed release version ${JSON.stringify(version)}`, () => {
    const result = validateReleaseInput(version);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /RELEASE_VERSION must be/);
  });
}

test('rejects non-boolean workflow flags', () => {
  const invalidDryRun = validateReleaseInput('patch', {
    RELEASE_DRY_RUN: 'yes',
  });
  const invalidFirstRelease = validateReleaseInput('patch', {
    RELEASE_FIRST_RELEASE: '1',
  });

  assert.notEqual(invalidDryRun.status, 0);
  assert.match(invalidDryRun.stderr, /RELEASE_DRY_RUN must be either/);
  assert.notEqual(invalidFirstRelease.status, 0);
  assert.match(
    invalidFirstRelease.stderr,
    /RELEASE_FIRST_RELEASE must be either/,
  );
});

test('workflows install the npm version declared by packageManager', () => {
  const packageManagerMatch = /^npm@(\d+\.\d+\.\d+)$/.exec(
    packageManifest.packageManager,
  );
  assert.ok(
    packageManagerMatch,
    'packageManager must pin an exact npm version',
  );

  const expectedInstall = `run: npm install --global npm@${packageManagerMatch[1]}`;
  for (const workflow of ['ci.yml', 'pages.yml', 'release.yml']) {
    const workflowSource = readFileSync(
      new URL(`../.github/workflows/${workflow}`, import.meta.url),
      'utf8',
    );
    const setupNodeCount = workflowSource.match(
      /uses: actions\/setup-node@/g,
    )?.length;
    const pinnedNpmCount = workflowSource.split(expectedInstall).length - 1;

    assert.equal(
      pinnedNpmCount,
      setupNodeCount,
      `${workflow} must install the pinned npm after every setup-node step`,
    );
  }
});

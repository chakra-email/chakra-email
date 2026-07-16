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
const releaseWorkflowSource = readFileSync(
  new URL('../.github/workflows/release.yml', import.meta.url),
  'utf8',
);
const contributingSource = readFileSync(
  new URL('../CONTRIBUTING.md', import.meta.url),
  'utf8',
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

for (const version of ['major', 'minor', 'patch', 'prerelease']) {
  test(`rejects relative version ${version} for a first release`, () => {
    const result = validateReleaseInput(version, {
      RELEASE_FIRST_RELEASE: 'true',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must be an explicit semantic version/);
  });
}

test('accepts an explicit semantic version for a first release', () => {
  const result = validateReleaseInput('0.1.0', {
    RELEASE_FIRST_RELEASE: 'true',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'Validated release version: 0.1.0');
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

test('publish checks out the verified commit on main before Nx pushes', () => {
  const publishJob = releaseWorkflowSource.slice(
    releaseWorkflowSource.indexOf('\n  publish:'),
  );
  const branchCheckout = publishJob.indexOf('          ref: main');
  const verifiedSha = publishJob.indexOf(
    '          VERIFIED_SHA: ${{ github.sha }}',
  );
  const branchAssertion = publishJob.indexOf(
    `if [ "$current_branch" != 'main' ]; then`,
  );
  const shaAssertion = publishJob.indexOf(
    'if [ "$current_sha" != "$VERIFIED_SHA" ]; then',
  );
  const publish = publishJob.indexOf('      - name: Publish release');

  assert.ok(branchCheckout >= 0, 'publish must check out the main branch');
  assert.ok(
    verifiedSha > branchCheckout,
    'publish must retain the SHA that passed verification',
  );
  assert.ok(
    branchAssertion > verifiedSha && shaAssertion > branchAssertion,
    'publish must verify both the branch and commit before releasing',
  );
  assert.ok(publish > shaAssertion, 'Nx release must run after verification');
  assert.doesNotMatch(
    publishJob,
    /ref: \$\{\{ github\.sha \}\}/,
    'checking out a commit SHA would leave Nx release on detached HEAD',
  );
});

test('first publish authenticates the bootstrap token before releasing', () => {
  const publishJob = releaseWorkflowSource.slice(
    releaseWorkflowSource.indexOf('\n  publish:'),
  );
  const tokenCheck = publishJob.indexOf('if [ -z "$NODE_AUTH_TOKEN" ]; then');
  const authentication = publishJob.indexOf('          npm whoami >/dev/null');
  const publish = publishJob.indexOf('      - name: Publish release');

  assert.ok(tokenCheck >= 0, 'first publish must require the bootstrap token');
  assert.ok(
    authentication > tokenCheck && publish > authentication,
    'the bootstrap token must authenticate before Nx release runs',
  );
});

test('bootstrap documentation uses current granular token guidance', () => {
  assert.doesNotMatch(contributingSource, /npm automation token/i);
  assert.match(contributingSource, /granular access token/);
  assert.match(contributingSource, /Bypass 2FA/);
  assert.match(contributingSource, /allowed action `npm publish`/);
});

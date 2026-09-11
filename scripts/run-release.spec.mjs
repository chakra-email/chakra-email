import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertPreviewBinaryMetadata } from './packed-consumer-checks.mjs';

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
const ciWorkflowSource = readFileSync(
  new URL('../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const contributingSource = readFileSync(
  new URL('../CONTRIBUTING.md', import.meta.url),
  'utf8',
);
const nxConfiguration = JSON.parse(
  readFileSync(new URL('../nx.json', import.meta.url), 'utf8'),
);
const cleanSource = readFileSync(
  new URL('./clean-dist.mjs', import.meta.url),
  'utf8',
);
const packedConsumerSource = readFileSync(
  new URL('./smoke-packed-consumer.mjs', import.meta.url),
  'utf8',
);
const yalcSource = readFileSync(
  new URL('./yalc-publish.mjs', import.meta.url),
  'utf8',
);
const publicPackages = readdirSync(new URL('../packages/', import.meta.url), {
  withFileTypes: true,
}).flatMap((entry) => {
  if (!entry.isDirectory()) {
    return [];
  }
  const manifest = JSON.parse(
    readFileSync(
      new URL(`../packages/${entry.name}/package.json`, import.meta.url),
      'utf8',
    ),
  );
  return manifest.publishConfig?.access === 'public'
    ? [{ directory: entry.name, manifest }]
    : [];
});
const committedVersion = publicPackages[0]?.manifest.version;

test('site Postkit dependencies are pinned registry packages with opt-in yalc links', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../apps/site/package.json', import.meta.url), 'utf8'),
  );
  const lock = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
  );
  const version = manifest.dependencies['@postkit/react'];
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.dependencies['@postkit/shiki'], version);
  for (const name of ['react', 'shiki']) {
    assert.equal(
      lock.packages['apps/site'].dependencies[`@postkit/${name}`],
      version,
    );
  }
  for (const name of ['react', 'shiki', 'core', 'unfurl']) {
    const entry = lock.packages[`node_modules/@postkit/${name}`];
    assert.equal(entry.version, version);
    assert.equal(
      entry.resolved,
      `https://registry.npmjs.org/@postkit/${name}/-/${name}-${version}.tgz`,
    );
    assert.ok(entry.integrity);
    assert.notEqual(entry.link, true);
  }
  assert.ok(!manifest.scripts['yalc:link'].includes('@postkit/'));
  assert.ok(manifest.scripts['yalc:link:postkit'].includes('@postkit/react'));
});

test('packed preview binary validation follows the packed version across releases', () => {
  for (const version of ['0.1.0', '0.2.0', '1.0.0-beta.1']) {
    assert.doesNotThrow(() =>
      assertPreviewBinaryMetadata(
        {
          help: 'Chakra Email Preview\nUsage: chakra-email-preview',
          version: `${version}\n`,
        },
        version,
      ),
    );
  }
});

test('packed preview binary validation rejects mismatched or missing metadata', () => {
  assert.throws(
    () =>
      assertPreviewBinaryMetadata(
        { help: 'Chakra Email Preview', version: '0.1.0' },
        '0.2.0',
      ),
    /metadata check failed/,
  );
  assert.throws(
    () =>
      assertPreviewBinaryMetadata(
        { help: 'Wrong binary', version: '0.2.0' },
        '0.2.0',
      ),
    /metadata check failed/,
  );
  assert.throws(
    () =>
      assertPreviewBinaryMetadata(
        { help: 'Chakra Email Preview', version: '0.2.0' },
        undefined,
      ),
    /missing its version/,
  );
  assert.throws(
    () =>
      assertPreviewBinaryMetadata(
        { help: 'Chakra Email Preview', version: '0.2.0' },
        '',
      ),
    /missing its version/,
  );
  assert.ok(packedConsumerSource.includes('assertPreviewBinaryMetadata('));
  assert.match(
    packedConsumerSource,
    /packedPackages\.find\([\s\S]*?name === '@chakra-email\/preview'\)\s*\?\.version/,
  );
});

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

test('accepts the exact version committed in every public package', () => {
  const result = validateReleaseInput(committedVersion);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    `Validated committed release version ${committedVersion} for ${publicPackages.length} public packages.`,
  );
});

for (const version of [
  undefined,
  '',
  'major',
  'minor',
  'patch',
  'prerelease',
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

test('rejects an exact version that is not committed in the packages', () => {
  const uncommittedVersion =
    committedVersion === '999.999.999' ? '999.999.998' : '999.999.999';
  const result = validateReleaseInput(uncommittedVersion);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match the committed package versions/);
});

test('rejects non-boolean workflow flags', () => {
  const invalidDryRun = validateReleaseInput(committedVersion, {
    RELEASE_DRY_RUN: 'yes',
  });
  const invalidFirstRelease = validateReleaseInput(committedVersion, {
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

test('accepts the committed version for a first release', () => {
  const result = validateReleaseInput(committedVersion, {
    RELEASE_FIRST_RELEASE: 'true',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validated committed release version/);
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

test('every public package is covered by release, pack, local, and consumer gates', () => {
  const expectedNames = publicPackages
    .map(({ manifest }) => manifest.name)
    .sort();
  const releaseNames = [...nxConfiguration.release.projects].sort();

  assert.deepEqual(releaseNames, expectedNames);
  assert.equal(
    new Set(publicPackages.map(({ manifest }) => manifest.version)).size,
    1,
    'fixed release packages must start from the same version',
  );

  for (const { directory, manifest } of publicPackages) {
    assert.match(
      packageManifest.scripts['pack:inspect'],
      new RegExp(`--workspace ${manifest.name.replaceAll('/', '\\/')}(?: |$)`),
      `${manifest.name} must be included in pack inspection`,
    );
    assert.ok(
      packedConsumerSource.includes(`'${manifest.name}'`),
      `${manifest.name} must be included in the packed consumer smoke`,
    );
    assert.ok(
      yalcSource.includes(`name: '${manifest.name}'`),
      `${manifest.name} must be included in local yalc publishing`,
    );
    assert.match(
      cleanSource,
      new RegExp(`['"]${directory}['"]`),
      `${manifest.name} build output must be cleaned before release builds`,
    );
  }
});

test('publish checks out the verified commit and rejects an advanced main', () => {
  const publishJob = releaseWorkflowSource.slice(
    releaseWorkflowSource.indexOf('\n  publish:'),
  );
  const verifiedCheckout = publishJob.indexOf(
    '          ref: ${{ github.sha }}',
  );
  const verifiedSha = publishJob.indexOf(
    '          VERIFIED_SHA: ${{ github.sha }}',
  );
  const checkoutAssertion = publishJob.indexOf(
    'if [ "$current_sha" != "$VERIFIED_SHA" ]; then',
  );
  const mainAssertion = publishJob.indexOf(
    'if [ "$main_sha" != "$VERIFIED_SHA" ]; then',
  );
  const publish = publishJob.indexOf('      - name: Publish release');

  assert.ok(verifiedCheckout >= 0, 'publish must check out the verified SHA');
  assert.ok(
    verifiedSha > verifiedCheckout,
    'publish must retain the SHA that passed verification',
  );
  assert.ok(
    checkoutAssertion > verifiedSha && mainAssertion > checkoutAssertion,
    'publish must verify both the checkout and current main before publishing',
  );
  assert.ok(
    publish > mainAssertion,
    'package publication must run after verification',
  );
});

test('publish is read-only on GitHub and never creates Git credentials', () => {
  const publishJob = releaseWorkflowSource.slice(
    releaseWorkflowSource.indexOf('\n  publish:'),
  );

  assert.match(
    publishJob,
    /permissions:\n\s+contents: read\n\s+id-token: write/,
  );
  assert.match(publishJob, /persist-credentials: false/);
  assert.doesNotMatch(publishJob, /create-github-app-token/);
  assert.doesNotMatch(publishJob, /RELEASE_APP_/);
  assert.doesNotMatch(publishJob, /contents: write/);
  assert.doesNotMatch(publishJob, /persist-credentials: true/);
});

test('Nx release only publishes committed packages and cannot write Git state', () => {
  const releaseSource = readFileSync(releaseScript, 'utf8');

  assert.match(releaseSource, /\['exec', 'nx', '--', 'release', 'publish'\]/);
  assert.deepEqual(nxConfiguration.release.git, {
    commit: false,
    tag: false,
    push: false,
  });
  assert.equal(
    nxConfiguration.release.changelog.workspaceChangelog.createRelease,
    false,
  );
});

test('release publication requires successful CI for the exact commit', () => {
  const ciGateJob = releaseWorkflowSource.slice(
    releaseWorkflowSource.indexOf('\n  require-ci:'),
    releaseWorkflowSource.indexOf('\n  dry-run:'),
  );
  const publishJob = releaseWorkflowSource.slice(
    releaseWorkflowSource.indexOf('\n  publish:'),
  );

  assert.match(releaseWorkflowSource, /permissions:\n\s+actions: read/);
  assert.match(ciGateJob, /needs: require-main/);
  assert.match(ciGateJob, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(ciGateJob, /VERIFIED_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(ciGateJob, /gh api \\\n\s+--method GET/);
  assert.match(
    ciGateJob,
    /actions\/workflows\/ci\.yml\/runs/,
    'the release gate must query the CI workflow directly',
  );
  for (const filter of [
    '-f branch=main',
    '-f event=push',
    '-f head_sha="$VERIFIED_SHA"',
    '-f status=success',
  ]) {
    assert.match(
      ciGateJob,
      new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `the CI query must include ${filter}`,
    );
  }
  assert.match(ciGateJob, /if \[ -z "\$ci_run_id" \]; then/);
  assert.match(publishJob, /needs: require-ci/);

  assert.match(ciWorkflowSource, /node-label: 24\n\s+node-version: 24\.18\.0/);
  assert.match(ciWorkflowSource, /npm run release:check/);
  assert.match(ciWorkflowSource, /\n  minimum-node-compatibility:/);
  assert.match(ciWorkflowSource, /node-version: 20\.19\.0/);
  assert.match(ciWorkflowSource, /npm run smoke:consumer/);
  assert.doesNotMatch(
    publishJob,
    /needs: require-main/,
    'publish must depend on the CI gate, not only the branch check',
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
    'the bootstrap token must authenticate before package publication',
  );
});

test('bootstrap documentation uses current granular token guidance', () => {
  assert.doesNotMatch(contributingSource, /npm automation token/i);
  assert.match(contributingSource, /granular access token/);
  assert.match(contributingSource, /Bypass 2FA/);
  assert.match(contributingSource, /allowed action `npm publish`/);
});

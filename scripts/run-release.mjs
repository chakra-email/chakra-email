import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const numericIdentifier = '(?:0|[1-9]\\d*)';
const nonNumericIdentifier = '(?:\\d*[A-Za-z-][0-9A-Za-z-]*)';
const prereleaseIdentifier = `(?:${numericIdentifier}|${nonNumericIdentifier})`;
const semverPattern = new RegExp(
  `^${numericIdentifier}\\.${numericIdentifier}\\.${numericIdentifier}` +
    `(?:-${prereleaseIdentifier}(?:\\.${prereleaseIdentifier})*)?` +
    '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$',
);

function readBoolean(name) {
  const value = process.env[name];

  if (value !== 'true' && value !== 'false') {
    throw new Error(`${name} must be either "true" or "false".`);
  }

  return value === 'true';
}

const version = process.env.RELEASE_VERSION;

if (
  typeof version !== 'string' ||
  version.length > 128 ||
  !semverPattern.test(version)
) {
  throw new Error(
    'RELEASE_VERSION must be an explicit semantic version already committed in every public package.',
  );
}

const dryRun = readBoolean('RELEASE_DRY_RUN');
const firstRelease = readBoolean('RELEASE_FIRST_RELEASE');

const packagesDirectory = new URL('../packages/', import.meta.url);
const publicPackages = readdirSync(packagesDirectory, {
  withFileTypes: true,
}).flatMap((entry) => {
  if (!entry.isDirectory()) {
    return [];
  }

  const manifest = JSON.parse(
    readFileSync(
      new URL(`${entry.name}/package.json`, packagesDirectory),
      'utf8',
    ),
  );

  return manifest.publishConfig?.access === 'public'
    ? [{ name: manifest.name, version: manifest.version }]
    : [];
});

if (publicPackages.length === 0) {
  throw new Error('No public packages were found to publish.');
}

const mismatchedPackages = publicPackages.filter(
  (manifest) => manifest.version !== version,
);

if (mismatchedPackages.length > 0) {
  const versions = mismatchedPackages
    .map((manifest) => `${manifest.name}@${manifest.version}`)
    .join(', ');
  throw new Error(
    `RELEASE_VERSION ${version} does not match the committed package versions: ${versions}.`,
  );
}

const args = ['exec', 'nx', '--', 'release', 'publish'];

if (dryRun) {
  args.push('--dry-run');
}

if (firstRelease) {
  args.push('--first-release');
}

if (process.argv.includes('--validate-only')) {
  console.log(
    `Validated committed release version ${version} for ${publicPackages.length} public packages.`,
  );
} else {
  const result = spawnSync(npmCommand, args, {
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}

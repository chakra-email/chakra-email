import { spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const releaseKeywords = new Set(['major', 'minor', 'patch', 'prerelease']);
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
  (!releaseKeywords.has(version) && !semverPattern.test(version))
) {
  throw new Error(
    'RELEASE_VERSION must be major, minor, patch, prerelease, or an explicit semantic version.',
  );
}

const dryRun = readBoolean('RELEASE_DRY_RUN');
const firstRelease = readBoolean('RELEASE_FIRST_RELEASE');
const args = ['exec', 'nx', '--', 'release', version, '--yes'];

if (dryRun) {
  args.push('--dry-run');
}

if (firstRelease) {
  args.push('--first-release');
}

if (process.argv.includes('--validate-only')) {
  console.log(`Validated release version: ${version}`);
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

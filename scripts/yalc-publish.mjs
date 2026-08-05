import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const shouldPush = process.argv.includes('--push');
const yalcCommand = shouldPush ? 'push' : 'publish';
const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));
const yalcBin = join(
  workspaceRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'yalc.cmd' : 'yalc',
);

const packages = [
  {
    name: '@chakra-email/core',
    root: join(workspaceRoot, 'packages', 'core'),
  },
  {
    name: '@chakra-email/preview',
    root: join(workspaceRoot, 'packages', 'preview'),
  },
  {
    name: 'chakra-email',
    root: join(workspaceRoot, 'packages', 'chakra-email'),
  },
  {
    name: '@chakra-email/chakra-v2',
    root: join(workspaceRoot, 'packages', 'chakra-email-v2'),
  },
];

for (const packageConfig of packages) {
  assertPackageReady(packageConfig);
}

for (const packageConfig of packages) {
  console.log(
    `${yalcCommand === 'push' ? 'Pushing' : 'Publishing'} ${packageConfig.name} with yalc`,
  );

  const result = spawnSync(yalcBin, [yalcCommand], {
    cwd: packageConfig.root,
    stdio: 'inherit',
  });

  if (result.error?.code === 'ENOENT') {
    console.error(
      'Could not find the workspace yalc binary. Run `npm ci` before invoking this target.',
    );
    process.exit(1);
  }

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(
  shouldPush
    ? 'Published all packages to yalc and pushed updates to yalc installations.'
    : 'Published all packages to the local yalc store.',
);

function assertPackageReady(packageConfig) {
  const packageJsonPath = join(packageConfig.root, 'package.json');
  const distEntryPath = join(packageConfig.root, 'dist', 'index.js');

  if (!existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json for ${packageConfig.name}`);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.name !== packageConfig.name) {
    throw new Error(
      `Expected ${packageConfig.root} to be ${packageConfig.name}, found ${packageJson.name}`,
    );
  }

  if (!existsSync(distEntryPath)) {
    throw new Error(
      `Missing ${distEntryPath}. Run the Nx yalc-publish target so package builds complete first.`,
    );
  }
}

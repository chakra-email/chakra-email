import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));
const tempRoot = mkdtempSync(join(tmpdir(), 'chakra-email-consumer-'));
const tarballDirectory = join(tempRoot, 'tarballs');
const consumerDirectory = join(tempRoot, 'consumer');
const packageNames = [
  '@chakra-email/core',
  'chakra-email',
  '@chakra-email/chakra-v2',
];
const commandEnvironment = {
  ...process.env,
  npm_config_audit: 'false',
  npm_config_cache: join(workspaceRoot, '.npm-cache'),
  npm_config_fund: 'false',
  npm_config_provenance: 'false',
};

function runNpm(args, cwd, captureOutput = false) {
  return execFileSync(npmCommand, args, {
    cwd,
    encoding: captureOutput ? 'utf8' : undefined,
    env: commandEnvironment,
    stdio: captureOutput ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
}

try {
  mkdirSync(tarballDirectory, { recursive: true });
  mkdirSync(consumerDirectory, { recursive: true });

  const packArguments = ['pack'];
  for (const packageName of packageNames) {
    packArguments.push('--workspace', packageName);
  }
  packArguments.push(
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    tarballDirectory,
  );

  const packOutput = runNpm(packArguments, workspaceRoot, true);
  const packedPackages = JSON.parse(packOutput);
  const tarballs = new Map(
    packedPackages.map(({ name, filename }) => [
      name,
      `file:${join(tarballDirectory, filename)}`,
    ]),
  );

  for (const packageName of packageNames) {
    if (!tarballs.has(packageName)) {
      throw new Error(`npm pack did not produce a tarball for ${packageName}.`);
    }
  }

  writeFileSync(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'chakra-email-packed-consumer-smoke',
        private: true,
        type: 'module',
        dependencies: {
          '@chakra-email/chakra-v2': tarballs.get('@chakra-email/chakra-v2'),
          '@chakra-email/core': tarballs.get('@chakra-email/core'),
          'chakra-email': tarballs.get('chakra-email'),
          react: '18.3.1',
          'react-dom': '18.3.1',
        },
        devDependencies: {
          '@types/react': '18.3.31',
          '@types/react-dom': '18.3.7',
          typescript: '5.9.3',
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(consumerDirectory, 'smoke.mjs'),
    `import React from 'react';
import { ThemeProvider } from '@chakra-email/core';
import { ChakraEmailV2Provider } from '@chakra-email/chakra-v2';
import { Body, Head, Html, Preview, Text, render } from 'chakra-email';

if (!React.version.startsWith('18.')) {
  throw new Error('The packed consumer must resolve React 18.');
}

const email = React.createElement(
  ThemeProvider,
  null,
  React.createElement(
    ChakraEmailV2Provider,
    null,
    React.createElement(
      Html,
      null,
      React.createElement(Head),
      React.createElement(Preview, null, 'Packed consumer preview'),
      React.createElement(
        Body,
        null,
        React.createElement(Text, null, 'Packed consumer smoke')
      )
    )
  )
);
const html = await render(email);

if (!html.includes('Packed consumer smoke') || !html.startsWith('<!DOCTYPE')) {
  throw new Error('The packed ESM consumer did not render the expected email.');
}

const bodyStart = html.indexOf('<body');
const preview = html.indexOf('Packed consumer preview');
const bodyEnd = html.indexOf('</body>');

if (
  bodyStart === -1 ||
  preview === -1 ||
  bodyEnd === -1 ||
  preview <= bodyStart ||
  preview >= bodyEnd
) {
  throw new Error('The packed React 18 preview must render inside the body.');
}

const packageSubpaths = [
  '@chakra-email/core/components',
  '@chakra-email/core/render',
  '@chakra-email/core/system',
  '@chakra-email/core/theme',
  'chakra-email/components',
  'chakra-email/render',
  'chakra-email/system',
  'chakra-email/theme',
  '@chakra-email/chakra-v2/components',
  '@chakra-email/chakra-v2/render',
  '@chakra-email/chakra-v2/system',
  '@chakra-email/chakra-v2/theme',
];

for (const packageSubpath of packageSubpaths) {
  const packageExports = await import(packageSubpath);
  if (Object.keys(packageExports).length === 0) {
    throw new Error(packageSubpath + ' did not expose any ESM exports.');
  }
}

console.log('ok packed ESM runtime and subpaths with React 18');
`,
  );

  writeFileSync(
    join(consumerDirectory, 'smoke.cjs'),
    `const packageNames = [
  '@chakra-email/core',
  'chakra-email',
  '@chakra-email/chakra-v2',
];

for (const packageName of packageNames) {
  const packageExports = require(packageName);
  if (typeof packageExports.render !== 'function') {
    throw new Error(packageName + ' did not expose render through require(esm).');
  }
}

const packageSubpaths = [
  '@chakra-email/core/components',
  '@chakra-email/core/render',
  '@chakra-email/core/system',
  '@chakra-email/core/theme',
  'chakra-email/components',
  'chakra-email/render',
  'chakra-email/system',
  'chakra-email/theme',
  '@chakra-email/chakra-v2/components',
  '@chakra-email/chakra-v2/render',
  '@chakra-email/chakra-v2/system',
  '@chakra-email/chakra-v2/theme',
];

for (const packageSubpath of packageSubpaths) {
  const packageExports = require(packageSubpath);
  if (Object.keys(packageExports).length === 0) {
    throw new Error(packageSubpath + ' did not expose any require(esm) exports.');
  }
}

console.log('ok packed require(esm) runtime and subpaths');
`,
  );

  writeFileSync(
    join(consumerDirectory, 'smoke.tsx'),
    `import type { ComponentType, ReactElement } from 'react';
import { ThemeProvider, type ThemeProviderProps } from '@chakra-email/core';
import * as CoreComponents from '@chakra-email/core/components';
import * as CoreRender from '@chakra-email/core/render';
import * as CoreSystem from '@chakra-email/core/system';
import * as CoreTheme from '@chakra-email/core/theme';
import {
  ChakraEmailV2Provider,
  type ChakraEmailV2ProviderProps,
} from '@chakra-email/chakra-v2';
import * as V2Components from '@chakra-email/chakra-v2/components';
import * as V2Render from '@chakra-email/chakra-v2/render';
import * as V2System from '@chakra-email/chakra-v2/system';
import * as V2Theme from '@chakra-email/chakra-v2/theme';
import { Body, Html, Text, render } from 'chakra-email';
import * as ChakraComponents from 'chakra-email/components';
import * as ChakraRender from 'chakra-email/render';
import * as ChakraSystem from 'chakra-email/system';
import * as ChakraTheme from 'chakra-email/theme';

const CoreProvider: ComponentType<ThemeProviderProps> = ThemeProvider;
const V2Provider: ComponentType<ChakraEmailV2ProviderProps> =
  ChakraEmailV2Provider;
const email: ReactElement = (
  <CoreProvider>
    <V2Provider>
      <Html>
        <Body>
          <Text>Typed packed consumer smoke</Text>
        </Body>
      </Html>
    </V2Provider>
  </CoreProvider>
);

void render(email);
void [
  CoreComponents,
  CoreRender,
  CoreSystem,
  CoreTheme,
  ChakraComponents,
  ChakraRender,
  ChakraSystem,
  ChakraTheme,
  V2Components,
  V2Render,
  V2System,
  V2Theme,
];
`,
  );

  writeFileSync(
    join(consumerDirectory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: 'react-jsx',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2022',
        },
        include: ['smoke.tsx'],
      },
      null,
      2,
    )}\n`,
  );

  runNpm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
    ],
    consumerDirectory,
  );
  execFileSync(process.execPath, ['smoke.mjs'], {
    cwd: consumerDirectory,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, ['smoke.cjs'], {
    cwd: consumerDirectory,
    stdio: 'inherit',
  });
  execFileSync(
    join(
      consumerDirectory,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
    ),
    ['-p', 'tsconfig.json'],
    { cwd: consumerDirectory, stdio: 'inherit' },
  );
  console.log('ok packed TypeScript declarations with React 18');
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

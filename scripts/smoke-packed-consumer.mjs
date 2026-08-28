import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
  '@chakra-email/preview',
  '@chakra-email/react-email',
  '@chakra-email/code-block',
  '@chakra-email/markdown',
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
          '@chakra-email/code-block': tarballs.get('@chakra-email/code-block'),
          '@chakra-email/core': tarballs.get('@chakra-email/core'),
          '@chakra-email/markdown': tarballs.get('@chakra-email/markdown'),
          '@chakra-email/preview': tarballs.get('@chakra-email/preview'),
          '@chakra-email/react-email': tarballs.get(
            '@chakra-email/react-email',
          ),
          'chakra-email': tarballs.get('chakra-email'),
          react: '18.3.1',
          'react-dom': '18.3.1',
          'react-email': '6.9.1',
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
import { CodeBlock } from '@chakra-email/code-block';
import { Markdown } from '@chakra-email/markdown';
import {
  createPreviewServer,
  defineConfig,
  exportTemplates,
  lintRenderedEmail,
} from '@chakra-email/preview';
import { reactEmailRenderer } from '@chakra-email/react-email';
import { Body, Head, Html, Preview, Text, render } from 'chakra-email';

if (!React.version.startsWith('18.')) {
  throw new Error('The packed consumer must resolve React 18.');
}

if (
  typeof createPreviewServer !== 'function' ||
  typeof exportTemplates !== 'function' ||
  defineConfig({ port: 0 }).port !== 0 ||
  !lintRenderedEmail('<img src="https://example.com/logo.png">').some(
    (finding) => finding.ruleId === 'image-alt'
  )
) {
  throw new Error('The packed preview package did not expose its public API.');
}

if (typeof reactEmailRenderer !== 'function') {
  throw new Error('@chakra-email/react-email did not expose its renderer adapter.');
}

const markdownHtml = await render(
  React.createElement(
    ThemeProvider,
    null,
    React.createElement(Markdown, null, '# Packed markdown'),
    React.createElement(CodeBlock, { code: 'const packed = true;' })
  )
);
if (!markdownHtml.includes('Packed markdown') || !markdownHtml.includes('const packed = true;')) {
  throw new Error('The optional content packages did not render.');
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

const previewExports = require('@chakra-email/preview');
if (
  typeof previewExports.createPreviewServer !== 'function' ||
  typeof previewExports.defineConfig !== 'function' ||
  typeof previewExports.exportTemplates !== 'function' ||
  typeof previewExports.lintRenderedEmail !== 'function'
) {
  throw new Error('@chakra-email/preview did not expose its require(esm) API.');
}

const reactEmailAdapter = require('@chakra-email/react-email');
if (typeof reactEmailAdapter.reactEmailRenderer !== 'function') {
  throw new Error('@chakra-email/react-email did not expose its require(esm) API.');
}

const codeBlockPackage = require('@chakra-email/code-block');
const markdownPackage = require('@chakra-email/markdown');
if (
  typeof codeBlockPackage.CodeBlock !== 'function' ||
  typeof markdownPackage.Markdown !== 'function'
) {
  throw new Error('Optional content packages did not expose require(esm) APIs.');
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
import { CodeBlock, type CodeBlockProps } from '@chakra-email/code-block';
import { Markdown, type MarkdownProps } from '@chakra-email/markdown';
import * as CoreComponents from '@chakra-email/core/components';
import * as CoreRender from '@chakra-email/core/render';
import * as CoreSystem from '@chakra-email/core/system';
import * as CoreTheme from '@chakra-email/core/theme';
import {
  ChakraEmailV2Provider,
  type ChakraEmailV2ProviderProps,
} from '@chakra-email/chakra-v2';
import {
  createPreviewServer,
  defineConfig,
  exportTemplates,
  lintRenderedEmail,
  type PreviewLintFinding,
  type PreviewConfig,
  type PreviewTestTransport,
} from '@chakra-email/preview';
import { reactEmailRenderer } from '@chakra-email/react-email';
import * as V2Components from '@chakra-email/chakra-v2/components';
import * as V2Render from '@chakra-email/chakra-v2/render';
import * as V2System from '@chakra-email/chakra-v2/system';
import * as V2Theme from '@chakra-email/chakra-v2/theme';
import { Body, Html, Text, render } from 'chakra-email';
import * as ChakraComponents from 'chakra-email/components';
import * as ChakraRender from 'chakra-email/render';
import * as ChakraSystem from 'chakra-email/system';
import {
  chakraEmailThemeConfig,
  type ChakraEmailThemeConfig,
} from 'chakra-email/theme';

const CoreProvider: ComponentType<ThemeProviderProps> = ThemeProvider;
const V2Provider: ComponentType<ChakraEmailV2ProviderProps> =
  ChakraEmailV2Provider;
const codeBlockProps: CodeBlockProps = { code: 'const typed = true;' };
const markdownProps: MarkdownProps = { children: '# Typed markdown' };
const packedThemeConfig: ChakraEmailThemeConfig = chakraEmailThemeConfig;
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
const testSend: PreviewTestTransport = {
  async send(message) {
    return { id: message.to };
  },
};
const previewConfig: PreviewConfig = defineConfig({
  root: '.',
  templates: 'emails',
  port: 0,
  testSend,
});
void reactEmailRenderer();
void <CodeBlock {...codeBlockProps} />;
void <Markdown {...markdownProps} />;
void createPreviewServer({ config: previewConfig, port: 0 });
void exportTemplates;
const lintFindings: PreviewLintFinding[] = lintRenderedEmail('<main>Test</main>');
void lintFindings;
void [
  CoreComponents,
  CoreRender,
  CoreSystem,
  CoreTheme,
  ChakraComponents,
  ChakraRender,
  ChakraSystem,
  packedThemeConfig,
  V2Components,
  V2Render,
  V2System,
  V2Theme,
];
`,
  );

  writeFileSync(
    join(consumerDirectory, 'preview-template.mjs'),
    `import React from 'react';
import { Body, Html, Text } from 'chakra-email';

export const previewProps = { name: 'Packed preview' };

export default function PackedPreviewEmail({ name }) {
  return React.createElement(
    Html,
    null,
    React.createElement(
      Body,
      null,
      React.createElement(Text, null, 'Hello ' + name)
    )
  );
}
`,
  );

  writeFileSync(
    join(consumerDirectory, 'chakra-email.config.mjs'),
    `export default {
  root: '.',
  templates: '.',
  include: ['preview-template.mjs'],
  assets: 'public',
  port: 0,
};
`,
  );

  writeFileSync(
    join(consumerDirectory, 'preview-smoke.mjs'),
    `import { spawn } from 'node:child_process';
import { join } from 'node:path';

const cli = join(
  process.cwd(),
  'node_modules',
  '@chakra-email',
  'preview',
  'dist',
  'cli.js'
);
const child = spawn(
  process.execPath,
  [cli, '--config', 'chakra-email.config.mjs', '--port', '0'],
  { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }
);
let stderr = '';
child.stderr.setEncoding('utf8');
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

const exit = new Promise((resolve) => child.once('exit', resolve));
const previewUrl = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Packed preview CLI did not start in time. ' + stderr));
  }, 20_000);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    const match = /Chakra Email preview: (http:\\/\\/\\S+)/.exec(chunk);
    if (match) {
      clearTimeout(timeout);
      resolve(match[1]);
    }
  });
  child.once('exit', (code) => {
    clearTimeout(timeout);
    reject(new Error('Packed preview CLI exited early with ' + code + '. ' + stderr));
  });
});

try {
  const health = await fetch(previewUrl + '/api/health');
  if (!health.ok) {
    throw new Error('Packed preview health endpoint failed.');
  }

  const index = await fetch(previewUrl);
  const indexHtml = await index.text();
  const token = /name="chakra-email-preview-token"[^>]*content="([^"]+)"/.exec(indexHtml)?.[1];
  if (!index.ok || !token) {
    throw new Error('Packed preview UI or token injection is missing.');
  }

  const headers = { 'x-chakra-email-preview-token': token };
  const templatesResponse = await fetch(previewUrl + '/api/templates', { headers });
  const templates = await templatesResponse.json();
  const id = templates.templates?.[0]?.id;
  if (!templatesResponse.ok || !id) {
    throw new Error('Packed preview did not discover its fixture.');
  }

  const renderResponse = await fetch(previewUrl + '/api/render', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const rendered = await renderResponse.json();
  if (!renderResponse.ok || !rendered.html?.includes('Hello Packed preview')) {
    throw new Error('Packed preview did not render its fixture.');
  }

  console.log('ok packed preview CLI, UI assets, discovery, and rendering');
} finally {
  child.kill('SIGTERM');
  await Promise.race([
    exit,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}
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
  const previewBin = join(
    consumerDirectory,
    'node_modules',
    '.bin',
    process.platform === 'win32'
      ? 'chakra-email-preview.cmd'
      : 'chakra-email-preview',
  );
  const previewHelp = execFileSync(previewBin, ['--help'], {
    cwd: consumerDirectory,
    encoding: 'utf8',
  });
  const previewVersion = execFileSync(previewBin, ['--version'], {
    cwd: consumerDirectory,
    encoding: 'utf8',
  });
  if (
    !previewHelp.includes('Chakra Email Preview') ||
    previewVersion.trim() !== '0.1.0'
  ) {
    throw new Error(
      `Packed preview binary metadata check failed: ${JSON.stringify({
        help: previewHelp,
        version: previewVersion,
      })}`,
    );
  }
  console.log('ok packed preview binary help and version');
  execFileSync(
    previewBin,
    [
      'export',
      '--config',
      'chakra-email.config.mjs',
      '--out-dir',
      'exports',
      '--format',
      'both',
      '--default-only',
    ],
    { cwd: consumerDirectory, stdio: 'inherit' },
  );
  const exportedHtml = readFileSync(
    join(consumerDirectory, 'exports', 'preview-template.html'),
    'utf8',
  );
  const exportedText = readFileSync(
    join(consumerDirectory, 'exports', 'preview-template.txt'),
    'utf8',
  );
  if (
    !exportedHtml.includes('Hello Packed preview') ||
    !exportedText.includes('Hello Packed preview')
  ) {
    throw new Error('Packed preview CLI export did not render its fixture.');
  }
  console.log('ok packed preview CLI export');
  execFileSync(process.execPath, ['smoke.mjs'], {
    cwd: consumerDirectory,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, ['smoke.cjs'], {
    cwd: consumerDirectory,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, ['preview-smoke.mjs'], {
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

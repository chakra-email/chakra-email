import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderEmail } from 'chakra-email';
import ts from 'typescript';
import { extractQuickstart } from './readme-examples.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readmes = [
  'README.md',
  'packages/chakra-email/README.md',
  'packages/chakra-email-v2/README.md',
  'packages/core/README.md',
  'packages/preview/README.md',
  'packages/react-email/README.md',
  'packages/markdown/README.md',
  'packages/code-block/README.md',
];
// Generated modules remain beneath the workspace so bare imports resolve the
// real built public packages, not aliases or mocks. Only this unique directory
// is removed when validation finishes or fails.
const cache = path.join(root, '.nx/cache');
mkdirSync(cache, { recursive: true });
const temporary = mkdtempSync(path.join(cache, 'readme-smoke-'));
try {
  const sources = new Map(
    readmes.map((readme, index) => [
      path.join(temporary, `quickstart-${index}.tsx`),
      extractQuickstart(readFileSync(path.join(root, readme), 'utf8'), readme),
    ]),
  );
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noUnusedLocals: true,
    skipLibCheck: true,
    esModuleInterop: true,
    noEmitOnError: true,
    types: ['node', 'react'],
  };
  const host = ts.createCompilerHost(options);
  const originalSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (
    filename,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) =>
    sources.has(filename)
      ? ts.createSourceFile(
          filename,
          sources.get(filename),
          languageVersion,
          true,
          ts.ScriptKind.TSX,
        )
      : originalSourceFile(
          filename,
          languageVersion,
          onError,
          shouldCreateNewSourceFile,
        );
  host.writeFile = (filename, contents) => {
    assert.equal(path.dirname(filename), temporary);
    assert.ok(filename.endsWith('.js'));
    writeFileSync(filename.replace(/\.js$/, '.mjs'), contents);
  };
  const program = ts.createProgram([...sources.keys()], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (filename) => filename,
        getNewLine: () => '\n',
      }),
    );
  }
  assert.equal(program.emit().emitSkipped, false);
  for (const [index, readme] of readmes.entries()) {
    const example = await import(
      pathToFileURL(path.join(temporary, `quickstart-${index}.mjs`)).href
    );
    const output =
      typeof example.renderWelcomeEmail === 'function'
        ? await example.renderWelcomeEmail()
        : await renderEmail(
            createElement(example.default, example.previewProps ?? {}),
          );
    assert.equal(typeof output.html, 'string', readme);
    assert.match(output.html, /<!doctype html/i, readme);
    assert.match(output.html, /<body[\s>]/i, readme);
    assert.ok(output.text?.trim(), `${readme}: nonempty plain text`);
    assert.doesNotMatch(output.html, /\bundefined\b|\[object Object\]/, readme);
    console.log(`README quick start typechecked and rendered: ${readme}`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

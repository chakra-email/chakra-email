import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './cli.js';
import { previewLintRules } from './lint-rules.js';

describe('runCli export', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports templates from the CLI without starting a server', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'chakra-email-cli-export-'));
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    try {
      await runCli([
        'export',
        '--config',
        resolve(process.cwd(), '../../examples/preview/chakra-email.config.ts'),
        '--out-dir',
        outDir,
        '--format',
        'text',
        '--default-only',
        '--compact',
      ]);

      expect(
        await readFile(join(outDir, 'emails/welcome.txt'), 'utf8'),
      ).toMatch(/welcome/iu);
      await expect(
        readFile(join(outDir, 'manifest.json'), 'utf8'),
      ).resolves.toMatch('Welcome to Northstar Studio');
      expect(stdout).toHaveBeenCalledWith(
        expect.stringMatching(/Exported 1 template.+2 files/u),
      );
    } finally {
      await rm(outDir, { force: true, recursive: true });
    }
  }, 30_000);

  it('rejects invalid commands, formats, and server-only export flags', async () => {
    await expect(runCli(['unknown'])).rejects.toThrow('Unknown command');
    await expect(runCli(['export', '--format', 'pdf'])).rejects.toThrow(
      '--format',
    );
    await expect(runCli(['export', '--port', '4100'])).rejects.toThrow(
      'apply only to the preview server',
    );
  });
});

describe('runCli check', () => {
  const configFile = resolve(
    process.cwd(),
    '../../examples/preview/chakra-email.config.ts',
  );
  let exitCode: typeof process.exitCode;
  beforeEach(() => {
    exitCode = process.exitCode;
  });
  afterEach(() => {
    process.exitCode = exitCode;
    vi.restoreAllMocks();
  });

  it('prints check help including the repeatable rule and strict options', async () => {
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runCli(['check', '--help']);
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining('chakra-email-preview check [options]'),
    );
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining('--rule <id=level>'),
    );
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('--strict'));
  });

  it('parses repeated overrides, JSON, default-only, and strict exit codes', async () => {
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const rules = previewLintRules.flatMap((rule) => [
      '--rule',
      `${rule.id}=off`,
    ]);
    await runCli([
      'check',
      '-c',
      configFile,
      '--format',
      'json',
      '--default-only',
      ...rules,
      '--rule',
      'document-title=warning',
    ]);
    const report = JSON.parse(String(stdout.mock.calls[0][0])) as {
      version: number;
      summary: { templates: number; renders: number; warning: number };
    };
    expect(report).toMatchObject({
      version: 1,
      summary: { templates: 1, renders: 1, warning: 1 },
    });
    expect(process.exitCode).toBe(0);
    stdout.mockClear();
    await runCli([
      'check',
      '-c',
      configFile,
      '--default-only',
      '--strict',
      ...rules,
      '--rule',
      'document-title=warning',
    ]);
    expect(process.exitCode).toBe(1);
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining('1 template, 1 render'),
    );
  }, 30_000);

  it('sets exit code 2 for invalid check options and fatal configuration failures', async () => {
    for (const args of [
      ['--format', 'html'],
      ['--rule', 'document-title=high'],
      ['--rule', 'unknown=off'],
      ['--port', '4100'],
      ['--out-dir', 'dist'],
      ['--compact'],
      ['--config', 'does-not-exist.config.ts'],
    ]) {
      process.exitCode = 0;
      await expect(runCli(['check', ...args])).rejects.toThrow();
      expect(process.exitCode).toBe(2);
    }
  });

  it('rejects check-only options for export and preview commands', async () => {
    await expect(runCli(['export', '--strict'])).rejects.toThrow(
      'apply only to check',
    );
    await expect(runCli(['--check-links'])).rejects.toThrow(
      'apply only to check',
    );
  });

  it('uses exit code 2 for parse failures with config options before the check command', async () => {
    process.exitCode = 0;
    await expect(
      runCli(['--config', configFile, 'check', '--unknown']),
    ).rejects.toThrow();
    expect(process.exitCode).toBe(2);
  });
});

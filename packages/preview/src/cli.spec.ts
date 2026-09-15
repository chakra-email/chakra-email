import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './cli.js';

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

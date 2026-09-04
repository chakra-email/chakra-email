import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { exportTemplates } from './export-templates.js';

describe('exportTemplates', () => {
  it('exports default and named variants as deterministic HTML/text files', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'chakra-email-export-'));

    try {
      const result = await exportTemplates({
        config: {
          root: resolve(process.cwd(), '../../examples/preview'),
          templates: 'emails',
        },
        outDir,
      });

      expect(result.templateCount).toBe(1);
      expect(result.files).toHaveLength(6);
      expect(result.manifestPath).toBe(join(outDir, 'manifest.json'));
      expect(
        result.files.map((file) => relative(outDir, file.path)).sort(),
      ).toEqual([
        'emails/welcome--new-founder-ecdedccb.html',
        'emails/welcome--new-founder-ecdedccb.txt',
        'emails/welcome--trial-ending-05c75065.html',
        'emails/welcome--trial-ending-05c75065.txt',
        'emails/welcome.html',
        'emails/welcome.txt',
      ]);

      expect(
        await readFile(join(outDir, 'emails/welcome.html'), 'utf8'),
      ).toContain('<!DOCTYPE html');
      const trialText = await readFile(
        join(outDir, 'emails/welcome--trial-ending-05c75065.txt'),
        'utf8',
      );
      expect(trialText).toBeTypeOf('string');
      expect(trialText).toMatch(/trial/iu);
      const manifest = JSON.parse(
        await readFile(join(outDir, 'manifest.json'), 'utf8'),
      ) as {
        templates: Array<{
          files: { html?: string; text?: string };
          subject: string;
          variant?: string;
        }>;
        version: number;
      };
      expect(manifest.version).toBe(1);
      expect(manifest.templates).toHaveLength(3);
      expect(manifest.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            files: {
              html: 'emails/welcome--trial-ending-05c75065.html',
              text: 'emails/welcome--trial-ending-05c75065.txt',
            },
            subject: 'Welcome to Field Notes',
            variant: 'trial-ending',
          }),
        ]),
      );
    } finally {
      await rm(outDir, { force: true, recursive: true });
    }
  }, 30_000);

  it('can export only compact plain text without variants', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'chakra-email-export-text-'));

    try {
      const result = await exportTemplates({
        config: {
          root: resolve(process.cwd(), '../../examples/preview'),
          templates: 'emails',
        },
        format: 'text',
        includeVariants: false,
        manifest: false,
        outDir,
        pretty: false,
      });

      expect(result.files).toEqual([
        expect.objectContaining({
          format: 'text',
          path: join(outDir, 'emails/welcome.txt'),
          variant: undefined,
        }),
      ]);
      expect(result.manifestPath).toBeUndefined();
      await expect(
        readFile(join(outDir, 'manifest.json'), 'utf8'),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(outDir, { force: true, recursive: true });
    }
  }, 30_000);

  it('rejects invalid formats before loading templates', async () => {
    await expect(
      exportTemplates({
        config: { root: process.cwd(), templates: 'missing' },
        format: 'pdf' as never,
      }),
    ).rejects.toThrow('Export format');
  });
});

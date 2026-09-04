import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import {
  loadPreviewConfig,
  normalizeConfig,
  type PreviewConfig,
  type ResolvedPreviewConfig,
} from './config.js';
import { discoverTemplates } from './discovery.js';
import { renderTemplate } from './render-template.js';
import { createTemplateModuleLoader } from './vite-loader.js';

export type ExportFormat = 'both' | 'html' | 'text';

export interface ExportTemplatesOptions {
  config?: PreviewConfig;
  configFile?: string;
  cwd?: string;
  /** Relative to the preview root. Defaults to `dist/emails`. */
  outDir?: string;
  format?: ExportFormat;
  /** Export named preview variants in addition to each default template. */
  includeVariants?: boolean;
  /** Pretty-print HTML output. Defaults to true. */
  pretty?: boolean;
  /** Write a deterministic `manifest.json`. Defaults to true. */
  manifest?: boolean;
}

export interface ExportedTemplateFile {
  format: Exclude<ExportFormat, 'both'>;
  path: string;
  templateId: string;
  variant?: string;
}

export interface ExportTemplatesResult {
  files: ExportedTemplateFile[];
  manifestPath?: string;
  outDir: string;
  templateCount: number;
}

export interface ExportManifestEntry {
  files: {
    html?: string;
    text?: string;
  };
  name: string;
  sourcePath: string;
  subject: string;
  templateId: string;
  variant?: string;
}

export interface ExportManifest {
  templates: ExportManifestEntry[];
  version: 1;
}

async function resolveExportConfig(
  options: ExportTemplatesOptions,
): Promise<ResolvedPreviewConfig> {
  if (options.config && options.configFile) {
    throw new Error('Provide either config or configFile, not both.');
  }

  return options.config
    ? normalizeConfig(options.config, undefined, options.cwd)
    : loadPreviewConfig({ configFile: options.configFile, cwd: options.cwd });
}

function templateStem(path: string): string {
  return path.replace(/\.(?:[cm]?[jt]sx?)$/u, '').replace(/\.email$/u, '');
}

function variantSuffix(variant: string): string {
  const readable = variant
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 48);
  const hash = createHash('sha256').update(variant).digest('hex').slice(0, 8);
  return `--${readable || 'variant'}-${hash}`;
}

function relativePosix(from: string, path: string): string {
  return relative(from, path).split(sep).join('/');
}

async function writeOutput(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, 'utf8');
}

/** Renders every discovered template into deterministic HTML/text artifacts. */
export async function exportTemplates(
  options: ExportTemplatesOptions = {},
): Promise<ExportTemplatesResult> {
  const format = options.format ?? 'both';
  const includeVariants = options.includeVariants ?? true;
  const includeManifest = options.manifest ?? true;
  const pretty = options.pretty ?? true;

  if (format !== 'both' && format !== 'html' && format !== 'text') {
    throw new Error('Export format must be "html", "text", or "both".');
  }

  const config = await resolveExportConfig(options);
  const registry = await discoverTemplates(config);
  const outDir = resolve(config.root, options.outDir ?? 'dist/emails');

  const loader = await createTemplateModuleLoader(config, () => undefined);
  const files: ExportedTemplateFile[] = [];
  const manifestEntries: ExportManifestEntry[] = [];

  try {
    for (const templateSummary of registry.templates) {
      const template = registry.byId.get(templateSummary.id);
      if (!template) {
        throw new Error(`Template registry is missing ${templateSummary.id}.`);
      }

      const module = await loader.load(template.absolutePath);
      const defaultOutput = await renderTemplate({
        module,
        pretty,
        renderer: config.renderer,
        template,
      });
      const variants = includeVariants ? defaultOutput.variants : [];

      for (const variant of [undefined, ...variants]) {
        const output = variant
          ? await renderTemplate({
              module,
              pretty,
              renderer: config.renderer,
              template,
              variant,
            })
          : defaultOutput;
        const stem = `${templateStem(template.path)}${variant ? variantSuffix(variant) : ''}`;
        const manifestFiles: ExportManifestEntry['files'] = {};

        if (format === 'both' || format === 'html') {
          const path = resolve(outDir, `${stem}.html`);
          await writeOutput(path, output.html);
          files.push({
            format: 'html',
            path,
            templateId: template.id,
            variant,
          });
          manifestFiles.html = relativePosix(outDir, path);
        }

        if (format === 'both' || format === 'text') {
          const path = resolve(outDir, `${stem}.txt`);
          await writeOutput(path, output.text);
          files.push({
            format: 'text',
            path,
            templateId: template.id,
            variant,
          });
          manifestFiles.text = relativePosix(outDir, path);
        }

        manifestEntries.push({
          files: manifestFiles,
          name: output.name,
          sourcePath: template.path,
          subject: output.subject,
          templateId: template.id,
          variant,
        });
      }
    }
  } finally {
    await loader.close();
  }

  let manifestPath: string | undefined;
  if (includeManifest) {
    manifestPath = resolve(outDir, 'manifest.json');
    const manifest: ExportManifest = { templates: manifestEntries, version: 1 };
    await writeOutput(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return {
    files,
    manifestPath,
    outDir,
    templateCount: registry.templates.length,
  };
}

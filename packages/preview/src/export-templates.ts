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
import type { RegisteredTemplate } from './discovery.js';
import type { PreviewRenderResponse } from './protocol.js';
import { normalizeJsonObject, renderTemplate } from './render-template.js';
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

export async function resolveTemplateConfig(
  options: Pick<ExportTemplatesOptions, 'config' | 'configFile' | 'cwd'>,
): Promise<ResolvedPreviewConfig> {
  if (options.config && options.configFile) {
    throw new Error('Provide either config or configFile, not both.');
  }

  return options.config
    ? normalizeConfig(options.config, undefined, options.cwd)
    : loadPreviewConfig({ configFile: options.configFile, cwd: options.cwd });
}

export interface RenderAllTemplatesOptions {
  includeVariants?: boolean;
  pretty?: boolean;
  /** Report individual failures and continue instead of failing the export. */
  continueOnError?: boolean;
}

export type RenderedTemplate = {
  template: RegisteredTemplate;
  variant?: string;
} & (
  | { output: PreviewRenderResponse; error?: never }
  | { output?: never; error: Error }
);

/** Shares discovery, module loading, variant iteration, and cleanup across CLI commands. */
export async function* renderAllTemplates(
  config: ResolvedPreviewConfig,
  options: RenderAllTemplatesOptions = {},
): AsyncGenerator<RenderedTemplate> {
  const registry = await discoverTemplates(config);
  const loader = await createTemplateModuleLoader(config, () => undefined);
  try {
    for (const summary of registry.templates) {
      const template = registry.byId.get(summary.id);
      if (!template)
        throw new Error(`Template registry is missing ${summary.id}.`);
      let variants: string[] = [];
      let module: Awaited<ReturnType<typeof loader.load>>;
      try {
        module = await loader.load(template.absolutePath);
        const definedVariants = normalizeJsonObject(
          module.previewVariants,
          'previewVariants',
        );
        variants =
          options.includeVariants === false
            ? []
            : Object.keys(definedVariants).sort((left, right) =>
                left.localeCompare(right),
              );
      } catch (error) {
        if (!options.continueOnError) throw error;
        yield {
          error: error instanceof Error ? error : new Error(String(error)),
          template,
        };
        continue;
      }
      try {
        const output = await renderTemplate({
          previewFrom: config.previewFrom,
          lintRules: config.lint?.rules,
          module,
          pretty: options.pretty ?? true,
          renderer: config.renderer,
          template,
        });
        yield { output, template };
      } catch (error) {
        if (!options.continueOnError) throw error;
        yield {
          error: error instanceof Error ? error : new Error(String(error)),
          template,
        };
      }
      for (const variant of variants) {
        try {
          const output = await renderTemplate({
            previewFrom: config.previewFrom,
            lintRules: config.lint?.rules,
            module,
            pretty: options.pretty ?? true,
            renderer: config.renderer,
            template,
            variant,
          });
          yield { output, template, variant };
        } catch (error) {
          if (!options.continueOnError) throw error;
          yield {
            error: error instanceof Error ? error : new Error(String(error)),
            template,
            variant,
          };
        }
      }
    }
  } finally {
    await loader.close();
  }
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

  const config = await resolveTemplateConfig(options);
  const outDir = resolve(config.root, options.outDir ?? 'dist/emails');

  const files: ExportedTemplateFile[] = [];
  const manifestEntries: ExportManifestEntry[] = [];
  const templateIds = new Set<string>();

  for await (const rendered of renderAllTemplates(config, {
    includeVariants,
    pretty,
  })) {
    if (rendered.error) throw rendered.error;
    const { output, template, variant } = rendered;
    templateIds.add(template.id);
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
    templateCount: templateIds.size,
  };
}

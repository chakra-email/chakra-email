import { access } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { createJiti } from 'jiti';
import type { EmailRenderer } from '@chakra-email/core';

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * A serializable Chakra theme fragment applied to the preview workspace.
 *
 * The fragment may include Chakra theme keys such as `tokens`,
 * `semanticTokens`, `recipes`, and `slotRecipes`. Functions are intentionally
 * unsupported because preview configuration is transferred to the browser.
 */
export type PreviewThemeConfig = JsonObject;

export interface PreviewConfig {
  /** Directory all preview paths are contained by. Relative to the config file. */
  root?: string;
  /** One or more template directories. Relative to `root`. Defaults to `emails`. */
  templates?: string | readonly string[];
  /** Glob patterns evaluated inside each template directory. */
  include?: readonly string[];
  /** Glob patterns excluded inside each template directory. */
  exclude?: readonly string[];
  /** Static asset directory served at `/assets/`. Relative to `root`. */
  assets?: string;
  /** Host to bind. Non-loopback hosts require an explicit server opt-in. */
  host?: string;
  /** Port to bind. Use `0` to select an available port programmatically. */
  port?: number;
  /** Serializable Chakra theme overrides for the preview workspace UI. */
  theme?: PreviewThemeConfig;
  /** Server-side renderer used to produce matching HTML and plain-text output. */
  renderer?: EmailRenderer;
}

export interface ResolvedPreviewConfig {
  assets: string;
  configFile?: string;
  exclude: readonly string[];
  host: string;
  include: readonly string[];
  port: number;
  root: string;
  renderer?: EmailRenderer;
  templateRoots: readonly string[];
  theme: PreviewThemeConfig;
}

export interface LoadPreviewConfigOptions {
  configFile?: string;
  cwd?: string;
  overrides?: Pick<PreviewConfig, 'host' | 'port'>;
}

const CONFIG_FILES = [
  'chakra-email.config.ts',
  'chakra-email.config.mts',
  'chakra-email.config.cts',
  'chakra-email.config.js',
  'chakra-email.config.mjs',
  'chakra-email.config.cjs',
] as const;

const DEFAULT_INCLUDE = ['**/*.{ts,tsx,mts,js,jsx,mjs}'] as const;
const DEFAULT_EXCLUDE = [
  '**/*.{spec,test}.{ts,tsx,mts,js,jsx,mjs}',
  '**/__tests__/**',
  '**/node_modules/**',
  '**/dist/**',
] as const;

export function defineConfig<const T extends PreviewConfig>(config: T): T {
  return config;
}

function assertContained(root: string, target: string, label: string): void {
  const pathFromRoot = relative(root, target);
  if (
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`${label} must be contained by the preview root.`);
  }
}

function normalizeStringList(
  value: readonly string[] | undefined,
  fallback: readonly string[],
  label: string,
): readonly string[] {
  const values = value ?? fallback;
  if (values.length === 0 || values.some((entry) => !entry.trim())) {
    throw new Error(`${label} must contain at least one non-empty pattern.`);
  }
  return [...values];
}

function normalizePort(port: number | undefined): number {
  const value = port ?? 4100;
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error('Preview port must be an integer between 0 and 65535.');
  }
  return value;
}

function normalizeTheme(
  theme: PreviewThemeConfig | undefined,
): PreviewThemeConfig {
  if (theme === undefined) {
    return {};
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(theme);
  } catch {
    throw new Error('Preview theme must be serializable as JSON.');
  }

  if (serialized === undefined) {
    throw new Error('Preview theme must be a JSON object.');
  }

  const normalized: unknown = JSON.parse(serialized);
  if (
    typeof normalized !== 'object' ||
    normalized === null ||
    Array.isArray(normalized)
  ) {
    throw new Error('Preview theme must be a JSON object.');
  }

  return normalized as PreviewThemeConfig;
}

export function normalizeConfig(
  config: PreviewConfig = {},
  configFile?: string,
  cwd = process.cwd(),
): ResolvedPreviewConfig {
  const configDirectory = configFile ? resolve(configFile, '..') : resolve(cwd);
  const root = resolve(configDirectory, config.root ?? '.');
  const configuredTemplates = config.templates
    ? typeof config.templates === 'string'
      ? [config.templates]
      : config.templates
    : config.include
      ? ['.']
      : ['emails'];
  if (
    configuredTemplates.length === 0 ||
    configuredTemplates.some((entry) => !entry.trim())
  ) {
    throw new Error('templates must contain at least one non-empty directory.');
  }

  const templateRoots = configuredTemplates.map((entry) => {
    const templateRoot = resolve(root, entry);
    assertContained(root, templateRoot, 'Each templates directory');
    return templateRoot;
  });
  const assets = resolve(root, config.assets ?? 'public');
  assertContained(root, assets, 'assets');

  const host = config.host?.trim() || '127.0.0.1';
  if (/[/\\\s]/u.test(host) || host.includes('://')) {
    throw new Error(
      'Preview host must be a hostname or IP address, not a URL.',
    );
  }

  return {
    assets,
    configFile,
    exclude: [
      ...DEFAULT_EXCLUDE,
      ...(config.exclude ?? []).filter(
        (entry) =>
          !DEFAULT_EXCLUDE.includes(entry as (typeof DEFAULT_EXCLUDE)[number]),
      ),
    ],
    host,
    include: normalizeStringList(config.include, DEFAULT_INCLUDE, 'include'),
    port: normalizePort(config.port),
    root,
    renderer: config.renderer,
    templateRoots,
    theme: normalizeTheme(config.theme),
  };
}

export async function findConfigFile(
  cwd = process.cwd(),
): Promise<string | undefined> {
  for (const name of CONFIG_FILES) {
    const candidate = resolve(cwd, name);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue through the supported config filenames.
    }
  }
  return undefined;
}

type ConfigExport =
  | PreviewConfig
  | (() => PreviewConfig | Promise<PreviewConfig>);

function isPreviewConfig(value: unknown): value is PreviewConfig {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function loadPreviewConfig(
  options: LoadPreviewConfigOptions = {},
): Promise<ResolvedPreviewConfig> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configFile = options.configFile
    ? resolve(cwd, options.configFile)
    : await findConfigFile(cwd);
  let rawConfig: PreviewConfig = {};

  if (configFile) {
    try {
      await access(configFile);
    } catch {
      throw new Error(`Preview config was not found: ${configFile}`);
    }

    const jiti = createJiti(import.meta.url, {
      interopDefault: true,
      moduleCache: false,
    });
    const loaded = await jiti.import<ConfigExport>(configFile, {
      default: true,
    });
    const evaluated = typeof loaded === 'function' ? await loaded() : loaded;
    if (!isPreviewConfig(evaluated)) {
      throw new Error(
        'Preview config must default-export an object or a function returning one.',
      );
    }
    rawConfig = evaluated;
  }

  return normalizeConfig(
    { ...rawConfig, ...options.overrides },
    configFile,
    cwd,
  );
}

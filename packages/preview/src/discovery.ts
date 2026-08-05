import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, sep } from 'node:path';
import { glob } from 'tinyglobby';
import type { ResolvedPreviewConfig } from './config.js';
import type { PreviewTemplate } from './protocol.js';

export interface RegisteredTemplate extends PreviewTemplate {
  absolutePath: string;
}

export interface TemplateRegistry {
  byId: ReadonlyMap<string, RegisteredTemplate>;
  templates: PreviewTemplate[];
}

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

function isContained(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target);
  return (
    pathFromRoot === '' ||
    (!isAbsolute(pathFromRoot) &&
      pathFromRoot !== '..' &&
      !pathFromRoot.startsWith(`..${sep}`))
  );
}

function createTemplateId(displayPath: string): string {
  return createHash('sha256')
    .update(displayPath)
    .digest('base64url')
    .slice(0, 20);
}

function createTemplateName(displayPath: string): string {
  const withoutExtension = displayPath
    .replace(/\.(?:[cm]?[jt]sx?)$/u, '')
    .replace(/\.email$/u, '');
  return withoutExtension
    .split('/')
    .map((part) =>
      part
        .replace(/[-_]+/gu, ' ')
        .replace(/^./u, (character) => character.toUpperCase()),
    )
    .join(' / ');
}

export async function discoverTemplates(
  config: ResolvedPreviewConfig,
): Promise<TemplateRegistry> {
  const canonicalRoot = await realpath(config.root);
  const paths = new Set<string>();

  for (const templateRoot of config.templateRoots) {
    const matches = await glob(config.include, {
      absolute: true,
      cwd: templateRoot,
      dot: false,
      followSymbolicLinks: false,
      ignore: config.exclude,
      onlyFiles: true,
    });
    for (const match of matches) {
      paths.add(match);
    }
  }

  const registered: RegisteredTemplate[] = [];
  for (const path of paths) {
    const canonicalPath = await realpath(path);
    if (!isContained(canonicalRoot, canonicalPath)) {
      throw new Error(
        'Discovered template resolves outside the configured preview root.',
      );
    }
    const displayPath = toPosix(relative(canonicalRoot, canonicalPath));
    registered.push({
      absolutePath: canonicalPath,
      id: createTemplateId(displayPath),
      name: createTemplateName(displayPath),
      path: displayPath,
    });
  }

  registered.sort((left, right) => left.path.localeCompare(right.path));
  const byId = new Map<string, RegisteredTemplate>();
  for (const template of registered) {
    if (byId.has(template.id)) {
      throw new Error(`Template ID collision for ${template.path}.`);
    }
    byId.set(template.id, template);
  }

  return {
    byId,
    templates: registered.map((template) => ({
      id: template.id,
      name: template.name,
      path: template.path,
    })),
  };
}

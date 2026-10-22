import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Example } from '../content';
import { createSiteDocPages, docPageDefinitions } from '../doc-pages';
import { createSiteDocsManifest } from '../docs-manifest';
import { exampleLinks } from '../site-resources';

const workspaceRoot = existsSync(
  path.join(process.cwd(), 'docs/getting-started.md'),
)
  ? process.cwd()
  : path.resolve(process.cwd(), '../..');

export async function loadSiteDocsManifest() {
  const sources = Object.fromEntries(
    await Promise.all(
      docPageDefinitions.map(async ({ sourceFile }) => [
        sourceFile,
        await readFile(path.join(workspaceRoot, 'docs', sourceFile), 'utf8'),
      ]),
    ),
  );
  return createSiteDocsManifest(createSiteDocPages(sources));
}

let manifestPromise: ReturnType<typeof loadSiteDocsManifest> | undefined;
export function getDocsManifest() {
  if (process.env.NODE_ENV !== 'production') return loadSiteDocsManifest();
  return (manifestPromise ??= loadSiteDocsManifest());
}

const exampleSources: Record<string, string> = {
  basic: 'basic/welcome-email.tsx',
  'markdown-body': 'markdown-body/markdown-email.tsx',
  'chakra-v2': 'chakra-v2/legacy-theme-email.tsx',
  preview: 'preview/emails/welcome.email.tsx',
};
export async function getExamples(): Promise<Example[]> {
  return Promise.all(
    exampleLinks.map(async (example) => ({
      ...example,
      source: await readFile(
        path.join(workspaceRoot, 'examples', exampleSources[example.id]),
        'utf8',
      ),
    })),
  );
}

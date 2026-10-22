import { getExamples, loadSiteDocsManifest } from '../server/content';

export const docsManifest = await loadSiteDocsManifest();
export const docPages = docsManifest.pages;
export const examples = await getExamples();

export type { SiteDocPage } from './doc-pages';
export type Example = {
  id: string;
  title: string;
  description: string;
  href: string;
  source: string;
};
export type PackageLink = {
  name: string;
  description: string;
  install: string;
  href: string;
};
export { packageLinks } from './site-resources';

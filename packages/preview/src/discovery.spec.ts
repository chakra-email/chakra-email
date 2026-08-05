import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeConfig } from './config.js';
import { discoverTemplates } from './discovery.js';

describe('discoverTemplates', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'chakra-email-discovery-'));
    await mkdir(join(root, 'emails', 'account'), { recursive: true });
    await writeFile(
      join(root, 'emails', 'welcome.email.tsx'),
      'export default 1;',
    );
    await writeFile(
      join(root, 'emails', 'welcome.spec.tsx'),
      'export default 1;',
    );
    await writeFile(
      join(root, 'emails', 'account', 'reset-password.ts'),
      'export default 1;',
    );
    await writeFile(join(root, 'emails', '.hidden.tsx'), 'export default 1;');
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('returns a sorted allow-list with opaque stable IDs', async () => {
    const config = normalizeConfig({ templates: 'emails' }, undefined, root);
    const first = await discoverTemplates(config);
    const second = await discoverTemplates(config);

    expect(first.templates).toEqual([
      expect.objectContaining({
        name: 'Emails / Account / Reset password',
        path: 'emails/account/reset-password.ts',
      }),
      expect.objectContaining({
        name: 'Emails / Welcome',
        path: 'emails/welcome.email.tsx',
      }),
    ]);
    expect(first.templates.map(({ id }) => id)).toEqual(
      second.templates.map(({ id }) => id),
    );
    expect(first.templates[0]?.id).not.toContain('reset-password');
    expect(
      first.byId.get(first.templates[0]?.id ?? '')?.absolutePath,
    ).toContain(root);
  });

  it('honors include patterns', async () => {
    const config = normalizeConfig(
      { include: ['emails/**/*.email.tsx'] },
      undefined,
      root,
    );
    const registry = await discoverTemplates(config);
    expect(registry.templates.map(({ path }) => path)).toEqual([
      'emails/welcome.email.tsx',
    ]);
  });
});

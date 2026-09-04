import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  defineConfig,
  findConfigFile,
  loadPreviewConfig,
  normalizeConfig,
} from './config.js';

describe('preview config', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((path) => rm(path, { force: true, recursive: true })),
    );
  });

  it('keeps defineConfig as a typed identity helper', () => {
    const config = { port: 4400 } as const;
    expect(defineConfig(config)).toBe(config);
  });

  it('resolves all paths from the config file and applies safe defaults', () => {
    const configFile = '/workspace/libs/emails/chakra-email.config.ts';
    const config = normalizeConfig({ root: '.', templates: 'src' }, configFile);

    expect(config).toMatchObject({
      allowedHosts: [],
      assets: '/workspace/libs/emails/public',
      host: '127.0.0.1',
      port: 4100,
      root: '/workspace/libs/emails',
      templateRoots: ['/workspace/libs/emails/src'],
    });
    expect(config.include).toContain('**/*.{ts,tsx,mts,js,jsx,mjs}');
    expect(config.exclude).toContain('**/__tests__/**');
  });

  it('uses root-relative include patterns when templates is omitted', () => {
    const config = normalizeConfig(
      { include: ['src/**/*.email.tsx'] },
      '/workspace/chakra-email.config.ts',
    );
    expect(config.templateRoots).toEqual(['/workspace']);
    expect(config.include).toEqual(['src/**/*.email.tsx']);
  });

  it('preserves a JSON-safe preview theme', () => {
    const theme = {
      semanticTokens: {
        colors: {
          preview: {
            accent: { value: { _dark: '#fafafa', _light: '#171717' } },
          },
        },
      },
    };

    expect(normalizeConfig({ theme }, undefined, '/workspace').theme).toEqual(
      theme,
    );
  });

  it('preserves a server-side renderer without serializing it', () => {
    const renderer = {
      render: vi.fn(async () => ({ html: '<p>HTML</p>', text: 'Text' })),
    };

    expect(
      normalizeConfig({ renderer }, undefined, '/workspace').renderer,
    ).toBe(renderer);
  });

  it('preserves a server-only test-send transport', () => {
    const testSend = { send: vi.fn(async () => ({ id: 'message-id' })) };

    expect(
      normalizeConfig({ testSend }, undefined, '/workspace').testSend,
    ).toBe(testSend);
  });

  it('normalizes exact trusted reverse-proxy hosts', () => {
    expect(
      normalizeConfig({
        allowedHosts: ['CHAKRA-EMAIL.TEST', '127.0.0.1', 'chakra-email.test'],
      }).allowedHosts,
    ).toEqual(['chakra-email.test', '127.0.0.1']);
  });

  it('rejects a circular preview theme', () => {
    const theme: Record<string, unknown> = {};
    theme['self'] = theme;

    expect(() =>
      normalizeConfig(
        { theme: theme as never },
        '/workspace/chakra-email.config.ts',
      ),
    ).toThrow('serializable as JSON');
  });

  it.each([
    [{ templates: '../private' }, 'templates directory'],
    [{ assets: '../private' }, 'assets'],
    [{ host: 'http://localhost' }, 'hostname'],
    [{ allowedHosts: ['*.example.test'] }, 'exact hostname'],
    [{ allowedHosts: ['example.test:4100'] }, 'exact hostname'],
    [{ allowedHosts: [' https://example.test'] }, 'exact hostname'],
    [{ port: 65_536 }, 'integer'],
    [{ include: [] }, 'include'],
    [{ testSend: {} as never }, 'send(message)'],
  ] as const)('rejects invalid config %#', (input, message) => {
    expect(() =>
      normalizeConfig(input, '/workspace/chakra-email.config.ts'),
    ).toThrow(message);
  });

  it('finds and loads a TypeScript config without caching its module', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'chakra-email-config-'));
    temporaryDirectories.push(directory);
    const configPath = join(directory, 'chakra-email.config.ts');
    await writeFile(
      configPath,
      'export default () => ({ root: "./mail", templates: "templates", port: 0 });\n',
    );

    await expect(findConfigFile(directory)).resolves.toBe(configPath);
    await expect(loadPreviewConfig({ cwd: directory })).resolves.toMatchObject({
      port: 0,
      root: resolve(directory, 'mail'),
      templateRoots: [resolve(directory, 'mail/templates')],
    });
  });

  it('reports a missing explicit config path', async () => {
    await expect(
      loadPreviewConfig({ configFile: 'missing.config.ts', cwd: '/workspace' }),
    ).rejects.toThrow('Preview config was not found');
  });
});

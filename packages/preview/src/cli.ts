#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { exportTemplates, type ExportFormat } from './export-templates.js';
import { createPreviewServer } from './server.js';

const HELP = `Chakra Email Preview

Usage:
  chakra-email-preview [options]
  chakra-email-preview export [options]

Options:
  -c, --config <path>  Preview config file (default: chakra-email.config.*)
      --host <host>    Host to bind (default: 127.0.0.1)
  -p, --port <port>    Port to bind (default: 4100)
      --allow-remote   Explicitly allow a non-loopback host
      --out-dir <path> Export destination (default: dist/emails)
      --format <value> Export html, text, or both (default: both)
      --default-only   Export templates without named preview variants
      --compact        Do not pretty-print exported HTML
  -h, --help           Show this help
  -v, --version        Show the package version
`;

async function packageVersion(): Promise<string> {
  const contents = await readFile(
    new URL('../package.json', import.meta.url),
    'utf8',
  );
  const manifest = JSON.parse(contents) as { version?: unknown };
  return typeof manifest.version === 'string' ? manifest.version : 'unknown';
}

function parsePort(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    throw new Error('--port must be an integer between 0 and 65535.');
  }
  const port = Number(value);
  if (port < 0 || port > 65_535) {
    throw new Error('--port must be an integer between 0 and 65535.');
  }
  return port;
}

function parseFormat(value: string | undefined): ExportFormat | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== 'html' && value !== 'text' && value !== 'both') {
    throw new Error('--format must be html, text, or both.');
  }
  return value;
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const { positionals, values: options } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      'allow-remote': { type: 'boolean' },
      config: { short: 'c', type: 'string' },
      compact: { type: 'boolean' },
      'default-only': { type: 'boolean' },
      format: { type: 'string' },
      help: { short: 'h', type: 'boolean' },
      host: { type: 'string' },
      'out-dir': { type: 'string' },
      port: { short: 'p', type: 'string' },
      version: { short: 'v', type: 'boolean' },
    },
    strict: true,
  });

  const command = positionals[0];
  if (positionals.length > 1 || (command && command !== 'export')) {
    throw new Error(`Unknown command: ${positionals.join(' ')}`);
  }

  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  if (options.version) {
    process.stdout.write(`${await packageVersion()}\n`);
    return;
  }

  if (command === 'export') {
    if (
      options['allow-remote'] ||
      options.host !== undefined ||
      options.port !== undefined
    ) {
      throw new Error(
        '--host, --port, and --allow-remote apply only to the preview server.',
      );
    }
    const exported = await exportTemplates({
      configFile: options.config,
      format: parseFormat(options.format),
      includeVariants: !(options['default-only'] ?? false),
      outDir: options['out-dir'],
      pretty: !(options.compact ?? false),
    });
    process.stdout.write(
      `Exported ${exported.templateCount} ${exported.templateCount === 1 ? 'template' : 'templates'} to ${exported.outDir} (${exported.files.length + (exported.manifestPath ? 1 : 0)} files).\n`,
    );
    return;
  }

  const allowRemote = options['allow-remote'] ?? false;
  const preview = await createPreviewServer({
    allowRemote,
    configFile: options.config,
    host: options.host,
    port: parsePort(options.port),
  });
  const address = await preview.listen();
  if (allowRemote) {
    process.stderr.write(
      'Warning: remote preview access is enabled. Anyone with network access and the session token can render local templates.\n',
    );
  }
  process.stdout.write(`Chakra Email preview: ${address.url}\n`);

  let closing = false;
  const close = (): void => {
    if (closing) {
      return;
    }
    closing = true;
    void preview.close().then(
      () => {
        process.exitCode = 0;
      },
      (error: unknown) => {
        process.stderr.write(
          `${error instanceof Error ? error.message : String(error)}\n`,
        );
        process.exitCode = 1;
      },
    );
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

const entrypoint = process.argv[1]
  ? pathToFileURL(realpathSync(process.argv[1])).href
  : undefined;
if (entrypoint === import.meta.url) {
  runCli().catch((error: unknown) => {
    process.stderr.write(
      `chakra-email-preview: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

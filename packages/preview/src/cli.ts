#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createPreviewServer } from './server.js';

const HELP = `Chakra Email Preview

Usage:
  chakra-email-preview [options]

Options:
  -c, --config <path>  Preview config file (default: chakra-email.config.*)
      --host <host>    Host to bind (default: 127.0.0.1)
  -p, --port <port>    Port to bind (default: 4100)
      --allow-remote   Explicitly allow a non-loopback host
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

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const { values: options } = parseArgs({
    allowPositionals: false,
    args: argv,
    options: {
      'allow-remote': { type: 'boolean' },
      config: { short: 'c', type: 'string' },
      help: { short: 'h', type: 'boolean' },
      host: { type: 'string' },
      port: { short: 'p', type: 'string' },
      version: { short: 'v', type: 'boolean' },
    },
    strict: true,
  });

  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  if (options.version) {
    process.stdout.write(`${await packageVersion()}\n`);
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

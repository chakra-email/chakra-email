#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  checkExitCode,
  checkTemplates,
  formatCheckReport,
} from './check-templates.js';
import { exportTemplates, type ExportFormat } from './export-templates.js';
import {
  normalizeLintRules,
  type PreviewLintOverrides,
  type PreviewLintLevel,
} from './lint-rules.js';
import { createPreviewServer } from './server.js';

const HELP = `Chakra Email Preview

Usage:
  chakra-email-preview [options]
  chakra-email-preview export [options]
  chakra-email-preview check [options]

Options:
  -c, --config <path>  Preview config file (default: chakra-email.config.*)
      --host <host>    Host to bind (default: 127.0.0.1)
  -p, --port <port>    Port to bind (default: 4100)
      --allow-remote   Explicitly allow a non-loopback host
      --out-dir <path> Export destination (default: dist/emails)
      --format <value> Export: html/text/both; check: text/json
      --default-only   Skip named preview variants in export or check
      --compact        Do not pretty-print exported HTML
      --strict         Check: fail on warnings as well as errors
      --check-links    Check: opt in to configured network link checks
      --rule <id=level> Check: repeatable severity override (off/info/warning/error)
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

function parseRuleFlags(flags: readonly string[] = []): PreviewLintOverrides {
  const overrides: Record<string, PreviewLintLevel> = Object.create(
    null,
  ) as Record<string, PreviewLintLevel>;
  for (const flag of flags) {
    const match = /^([^=]+)=(off|info|warning|error)$/u.exec(flag);
    if (!match)
      throw new Error(
        '--rule must be id=off, id=info, id=warning, or id=error.',
      );
    overrides[match[1]] = match[2] as PreviewLintLevel;
  }
  return normalizeLintRules(overrides);
}

/** Identifies the command even when strict option parsing fails. */
function requestedCommand(argv: readonly string[]): string | undefined {
  const takesValue = new Set([
    '-c',
    '--config',
    '--host',
    '-p',
    '--port',
    '--out-dir',
    '--format',
    '--rule',
  ]);
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--') return argv[index + 1];
    if (takesValue.has(argument)) {
      index++;
      continue;
    }
    if (!argument.startsWith('-')) return argument;
  }
  return undefined;
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  try {
    await runCliCommand(argv);
  } catch (error) {
    if (requestedCommand(argv) === 'check') process.exitCode = 2;
    throw error;
  }
}

async function runCliCommand(argv: string[]): Promise<void> {
  const { positionals, values: options } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      'allow-remote': { type: 'boolean' },
      config: { short: 'c', type: 'string' },
      compact: { type: 'boolean' },
      'check-links': { type: 'boolean' },
      'default-only': { type: 'boolean' },
      format: { type: 'string' },
      help: { short: 'h', type: 'boolean' },
      host: { type: 'string' },
      'out-dir': { type: 'string' },
      port: { short: 'p', type: 'string' },
      rule: { type: 'string', multiple: true },
      strict: { type: 'boolean' },
      version: { short: 'v', type: 'boolean' },
    },
    strict: true,
  });

  const command = positionals[0];
  if (
    positionals.length > 1 ||
    (command && command !== 'export' && command !== 'check')
  ) {
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

  if (command === 'check') {
    try {
      if (
        options.host !== undefined ||
        options.port !== undefined ||
        options['allow-remote']
      ) {
        throw new Error(
          '--host, --port, and --allow-remote apply only to the preview server.',
        );
      }
      if (options['out-dir'] !== undefined || options.compact) {
        throw new Error('--out-dir and --compact apply only to export.');
      }
      if (
        options.format !== undefined &&
        options.format !== 'text' &&
        options.format !== 'json'
      ) {
        throw new Error('--format must be text or json for check.');
      }
      const report = await checkTemplates({
        configFile: options.config,
        includeVariants: !options['default-only'],
        checkLinks: options['check-links'],
        rules: parseRuleFlags(options.rule),
      });
      process.stdout.write(
        options.format === 'json'
          ? `${JSON.stringify(report, null, 2)}\n`
          : formatCheckReport(
              report,
              Boolean(process.stdout.isTTY) &&
                process.env['NO_COLOR'] === undefined,
            ),
      );
      process.exitCode = checkExitCode(report, options.strict);
      return;
    } catch (error) {
      process.exitCode = 2;
      throw error;
    }
  }

  if (options.strict || options['check-links'] || options.rule !== undefined) {
    throw new Error('--strict, --check-links, and --rule apply only to check.');
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
    process.exitCode =
      process.exitCode === 2 ||
      requestedCommand(process.argv.slice(2)) === 'check'
        ? 2
        : 1;
  });
}

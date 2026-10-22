import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { requestLinkHead } from './link-network.js';
import type { PreviewLinkCheckEntry, PreviewLintFinding } from './protocol.js';
import {
  normalizeLintRules,
  resolveLintFinding,
  type PreviewLintOverrides,
  type PreviewLintRuleId,
} from './lint-rules.js';

export interface PreviewLinkCheckConfig {
  /** Exact HTTP(S) hostnames that may receive explicit link-check requests. */
  allowedHosts: readonly string[];
  /** Exact URLs to skip, in addition to built-in sensitive URL exclusions. */
  excludedUrls?: readonly string[];
  /** Per-request wall-clock deadline, 100–10000 ms. Default: 3000. */
  timeoutMs?: number;
  /** Maximum distinct URLs per check, 1–100. Default: 30. */
  maxUrls?: number;
  /** Cache lifetime, 0–300000 ms. Default: 60000. */
  cacheTtlMs?: number;
}

export interface PreviewLinkCheckResult {
  findings: PreviewLintFinding[];
  checked: number;
  skipped: number;
  links: PreviewLinkCheckEntry[];
}

export function normalizeLinkCheck(
  config: PreviewLinkCheckConfig,
): Required<PreviewLinkCheckConfig> {
  if (
    !config ||
    !Array.isArray(config.allowedHosts) ||
    !config.allowedHosts.length
  ) {
    throw new Error('linkCheck requires a non-empty allowedHosts list.');
  }
  const allowedHosts = config.allowedHosts.map((host) => {
    if (
      typeof host !== 'string' ||
      !/^[a-z0-9.-]+$/iu.test(host) ||
      host.includes('..')
    ) {
      throw new Error(
        'linkCheck.allowedHosts must contain exact hostnames, without ports or wildcards.',
      );
    }
    const url = new URL(`https://${host}`);
    if (url.hostname !== host.toLowerCase())
      throw new Error('Invalid link-check hostname.');
    return url.hostname;
  });
  const bounded = (
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number => {
    const result = value ?? fallback;
    if (!Number.isInteger(result) || result < min || result > max)
      throw new Error('Invalid link-check limit.');
    return result;
  };
  if (
    config.excludedUrls !== undefined &&
    (!Array.isArray(config.excludedUrls) ||
      config.excludedUrls.some((url) => typeof url !== 'string'))
  ) {
    throw new Error('linkCheck.excludedUrls must be an array of URLs.');
  }
  return {
    allowedHosts,
    excludedUrls: config.excludedUrls ?? [],
    timeoutMs: bounded(config.timeoutMs, 3000, 100, 10000),
    maxUrls: bounded(config.maxUrls, 30, 1, 100),
    cacheTtlMs: bounded(config.cacheTtlMs, 60000, 0, 300000),
  };
}

function skipReason(
  raw: string,
  config: Required<PreviewLinkCheckConfig>,
): string | undefined {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol))
      return 'Only absolute HTTP(S) links are checked.';
    if (
      raw !== raw.trim() ||
      Array.from(raw).some(
        (character) =>
          character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
      ) ||
      url.username ||
      url.password ||
      url.port
    )
      return 'Credentials, whitespace and nonstandard ports are not checked.';
    if (!config.allowedHosts.includes(url.hostname))
      return 'Hostname is not in linkCheck.allowedHosts.';
    let decoded = raw;
    for (let i = 0; i < 3; i++) decoded = decodeURIComponent(decoded);
    if (
      url.search ||
      /unsubscribe|opt[-_]?out|magic|token|login|log[-_]?out|sign[-_]?in|verify|confirm|activate|reset|tracking/iu.test(
        decoded,
      )
    )
      return 'Potentially sensitive URL skipped. Verify it manually with test data.';
    if (
      config.excludedUrls.some((value) => {
        const excluded = new URL(value);
        excluded.hash = '';
        url.hash = '';
        return excluded.href === url.href;
      })
    )
      return 'URL excluded by preview configuration.';
    return undefined;
  } catch {
    return 'Invalid or relative URL; not requested.';
  }
}

/** Creates a bounded, server-only checker with an instance-local cache. */
export function createEmailLinkChecker(
  options: PreviewLinkCheckConfig,
  lintRules?: PreviewLintOverrides,
): (html: string) => Promise<PreviewLinkCheckResult> {
  const config = normalizeLinkCheck(options);
  const overrides = normalizeLintRules(lintRules);
  type Outcome = Pick<PreviewLinkCheckEntry, 'status' | 'statusCode'> & {
    finding?: Pick<PreviewLintFinding, 'message' | 'suggestion'> & {
      ruleId: PreviewLintRuleId;
    };
  };
  const cache = new Map<string, { expires: number; outcome: Outcome }>();
  let running = false;
  return async (html) => {
    if (running) throw new Error('A link check is already running.');
    if (Buffer.byteLength(html, 'utf8') > 2 * 1024 * 1024)
      throw new Error('HTML is too large for link checking.');
    running = true;
    try {
      const links = new Map<
        string,
        { index: number; line?: number; column?: number }[]
      >();
      let index = 0;
      const pending: DefaultTreeAdapterTypes.Node[] = [
        parse(html, { sourceCodeLocationInfo: true, scriptingEnabled: false }),
      ];
      while (pending.length) {
        const node = pending.pop();
        if (!node) continue;
        // A stack needs reversed children to preserve the browser's document order.
        if ('childNodes' in node)
          pending.push(...[...node.childNodes].reverse());
        if (!('tagName' in node) || node.tagName !== 'a') continue;
        const raw = node.attrs.find((attr) => attr.name === 'href')?.value;
        if (raw === undefined) continue;
        const location = node.sourceCodeLocation?.attrs?.['href'];
        const occurrences = links.get(raw) ?? [];
        occurrences.push({
          index: index++,
          line: location?.startLine,
          column: location?.startCol,
        });
        links.set(raw, occurrences);
      }
      const result: PreviewLinkCheckResult = {
        findings: [],
        checked: 0,
        skipped: 0,
        links: [],
      };
      const queue = [...links.entries()];
      let admitted = 0;
      const check = async (raw: string): Promise<Outcome> => {
        const reason = skipReason(raw, config);
        if (reason || admitted >= config.maxUrls) {
          result.skipped++;
          return {
            status: 'skipped',
            finding: {
              ruleId: 'link-skipped',
              message: 'Link not checked.',
              suggestion: reason ?? 'Per-check URL limit reached.',
            },
          };
        }
        admitted++;
        result.checked++;
        const url = new URL(raw);
        url.hash = '';
        const cached = cache.get(url.href);
        if (cached && cached.expires > Date.now()) return cached.outcome;
        let outcome: Outcome;
        try {
          const response = await requestLinkHead(url, config.timeoutMs);
          const status = response.status;
          const statusCode =
            Number.isInteger(status) && status >= 100 && status <= 599
              ? status
              : undefined;
          if (status >= 200 && status < 300)
            outcome = { status: 'ok', statusCode };
          else if (status >= 300 && status < 400) {
            // Location is display-only: never follow it or turn it into an active link.
            let destination = 'No destination provided.';
            if (response.location) {
              try {
                const target = new URL(response.location, url);
                destination = `Destination: ${target.origin}${target.pathname.slice(0, 500)}${target.search ? '?[redacted]' : ''}`;
              } catch {
                destination = 'Invalid redirect destination.';
              }
            }
            outcome = {
              status: 'redirect',
              statusCode,
              finding: {
                ruleId: 'link-redirect',
                message: `HTTP ${status}: link redirects.`,
                suggestion: `${destination} Redirect was not followed; verify before changing the URL.`,
              },
            };
          } else {
            const broken = status === 404 || status === 410;
            outcome = {
              status: broken ? 'broken' : 'unverified',
              statusCode,
              finding: {
                ruleId: broken ? 'link-broken' : 'link-unverified',
                message: `HTTP ${status}: ${broken ? 'link appears broken' : 'link could not be verified'}.`,
                suggestion:
                  'Verify in a browser with test data. Some servers handle HEAD differently from GET.',
              },
            };
          }
        } catch {
          outcome = {
            status: 'unverified',
            finding: {
              ruleId: 'link-unverified',
              message: 'Link could not be verified.',
              suggestion:
                'DNS, TLS, timeout, or public-network restrictions prevented checking. Verify manually.',
            },
          };
        }
        if (cache.size >= 500) cache.clear();
        cache.set(url.href, {
          outcome,
          expires: Date.now() + config.cacheTtlMs,
        });
        return outcome;
      };
      await Promise.all(
        Array.from({ length: 3 }, async () => {
          while (queue.length) {
            const entry = queue.shift();
            if (!entry) break;
            const [raw, occurrences] = entry;
            const outcome = await check(raw);
            for (const { index, ...location } of occurrences) {
              result.links.push({
                index,
                ...location,
                status: outcome.status,
                ...(outcome.statusCode !== undefined
                  ? { statusCode: outcome.statusCode }
                  : {}),
              });
              if (outcome.finding) {
                const finding = resolveLintFinding(
                  {
                    ...outcome.finding,
                    ...location,
                    element: `a[href="${raw.split(/[?#]/u)[0].slice(0, 500)}"]`,
                  },
                  overrides,
                );
                if (finding) result.findings.push(finding);
              }
            }
          }
        }),
      );
      result.links.sort((a, b) => a.index - b.index);
      result.findings.sort(
        (a, b) =>
          (a.line ?? 0) - (b.line ?? 0) ||
          (a.column ?? 0) - (b.column ?? 0) ||
          a.ruleId.localeCompare(b.ruleId),
      );
      return result;
    } finally {
      running = false;
    }
  };
}

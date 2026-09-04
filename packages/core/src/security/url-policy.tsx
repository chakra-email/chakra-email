import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { EmailRenderError } from './errors.js';

export type EmailUrlKind = 'image' | 'link';
export type InvalidEmailUrlBehavior = 'omit' | 'throw';

export interface EmailUrlPolicy {
  allowedProtocols?: readonly string[];
  allowCredentials?: boolean;
  allowFragments?: boolean;
  maxBytes?: number;
  onInvalidUrl?: InvalidEmailUrlBehavior;
}

export interface EmailSecurityPolicy {
  image?: EmailUrlPolicy;
  link?: EmailUrlPolicy;
}

interface ResolvedEmailUrlPolicy {
  allowedProtocols: readonly string[];
  allowCredentials: boolean;
  allowFragments: boolean;
  maxBytes: number;
  onInvalidUrl: InvalidEmailUrlBehavior;
}

interface ResolvedEmailSecurityPolicy {
  image: ResolvedEmailUrlPolicy;
  link: ResolvedEmailUrlPolicy;
}

const protocolPattern = /^[a-z][a-z0-9+.-]*$/iu;
const urlProtocolPattern = /^([a-z][a-z0-9+.-]*):/iu;
const encodedCrLfPattern = /%(?:0a|0d)/iu;
const malformedPercentPattern = /%(?![0-9a-f]{2})/iu;

const strictLinkPolicy: ResolvedEmailUrlPolicy = Object.freeze({
  allowedProtocols: Object.freeze(['http', 'https', 'mailto', 'tel']),
  allowCredentials: false,
  allowFragments: true,
  maxBytes: 2_048,
  onInvalidUrl: 'omit',
});

const strictImagePolicy: ResolvedEmailUrlPolicy = Object.freeze({
  allowedProtocols: Object.freeze(['http', 'https', 'cid']),
  allowCredentials: false,
  allowFragments: false,
  maxBytes: 2_048,
  onInvalidUrl: 'omit',
});

const resolvedStrictEmailSecurityPolicy: ResolvedEmailSecurityPolicy =
  Object.freeze({
    image: strictImagePolicy,
    link: strictLinkPolicy,
  });

export const strictEmailSecurityPolicy: Readonly<EmailSecurityPolicy> =
  resolvedStrictEmailSecurityPolicy;

const EmailSecurityPolicyContext = createContext<ResolvedEmailSecurityPolicy>(
  resolvedStrictEmailSecurityPolicy,
);

export interface EmailSecurityPolicyProviderProps {
  children: ReactNode;
  policy?: EmailSecurityPolicy;
}

function invalidPolicy(message: string): never {
  throw new EmailRenderError('INVALID_COMPONENT_PROP', message);
}

function normalizeAllowedProtocols(
  protocols: readonly string[],
): readonly string[] {
  const normalized = protocols.map((protocol) =>
    protocol.replace(/:$/u, '').toLowerCase(),
  );
  if (normalized.some((protocol) => !protocolPattern.test(protocol))) {
    invalidPolicy('Email URL protocols must be valid scheme names.');
  }
  return [...new Set(normalized)];
}

function resolveUrlPolicy(
  parent: ResolvedEmailUrlPolicy,
  policy: EmailUrlPolicy | undefined,
): ResolvedEmailUrlPolicy {
  const maxBytes = policy?.maxBytes ?? parent.maxBytes;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    invalidPolicy('Email URL maxBytes must be a positive safe integer.');
  }
  const onInvalidUrl = policy?.onInvalidUrl ?? parent.onInvalidUrl;
  if (onInvalidUrl !== 'omit' && onInvalidUrl !== 'throw') {
    invalidPolicy('Email URL onInvalidUrl must be "omit" or "throw".');
  }

  return {
    allowedProtocols:
      policy?.allowedProtocols === undefined
        ? parent.allowedProtocols
        : normalizeAllowedProtocols(policy.allowedProtocols),
    allowCredentials: policy?.allowCredentials ?? parent.allowCredentials,
    allowFragments: policy?.allowFragments ?? parent.allowFragments,
    maxBytes,
    onInvalidUrl,
  };
}

function mergeSecurityPolicy(
  parent: ResolvedEmailSecurityPolicy,
  policy: EmailSecurityPolicy | undefined,
): ResolvedEmailSecurityPolicy {
  if (!policy) {
    return parent;
  }
  return {
    image: resolveUrlPolicy(parent.image, policy.image),
    link: resolveUrlPolicy(parent.link, policy.link),
  };
}

export function EmailSecurityPolicyProvider({
  children,
  policy,
}: EmailSecurityPolicyProviderProps) {
  const parent = useContext(EmailSecurityPolicyContext);
  const value = useMemo(
    () => mergeSecurityPolicy(parent, policy),
    [parent, policy],
  );
  return (
    <EmailSecurityPolicyContext.Provider value={value}>
      {children}
    </EmailSecurityPolicyContext.Provider>
  );
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function containsRawControl(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function containsEncodedControl(value: string): boolean {
  if (malformedPercentPattern.test(value)) {
    return true;
  }
  let decoded = value;
  for (let pass = 0; pass < 4; pass += 1) {
    if (encodedCrLfPattern.test(decoded) || containsRawControl(decoded)) {
      return true;
    }
    const next = decodeURIComponent(decoded);
    if (next === decoded) {
      return false;
    }
    decoded = next;
  }
  return encodedCrLfPattern.test(decoded) || containsRawControl(decoded);
}

function rejectUrl(
  kind: EmailUrlKind,
  policy: ResolvedEmailUrlPolicy,
  reason: string,
): undefined {
  if (policy.onInvalidUrl === 'throw') {
    throw new EmailRenderError(
      'UNSAFE_URL',
      `Unsafe ${kind} URL was rejected.`,
      {
        details: { kind, reason },
      },
    );
  }
  return undefined;
}

function validateUrl(
  value: string | undefined,
  kind: EmailUrlKind,
  policy: ResolvedEmailUrlPolicy,
): string | undefined {
  if (value === undefined || value.length === 0) {
    return rejectUrl(kind, policy, 'empty');
  }
  if (value !== value.trim()) {
    return rejectUrl(kind, policy, 'surrounding-whitespace');
  }
  if (byteLength(value) > policy.maxBytes) {
    return rejectUrl(kind, policy, 'too-long');
  }
  try {
    if (containsEncodedControl(value)) {
      return rejectUrl(kind, policy, 'control-character');
    }
  } catch {
    return rejectUrl(kind, policy, 'invalid-percent-encoding');
  }

  if (value.startsWith('#')) {
    return kind === 'link' && policy.allowFragments && value.length > 1
      ? value
      : rejectUrl(kind, policy, 'fragment');
  }
  if (!policy.allowFragments && value.includes('#')) {
    return rejectUrl(kind, policy, 'fragment');
  }

  const protocol = urlProtocolPattern.exec(value)?.[1]?.toLowerCase();
  if (protocol === undefined || !policy.allowedProtocols.includes(protocol)) {
    return rejectUrl(kind, policy, 'protocol');
  }
  if (
    (protocol === 'http' || protocol === 'https') &&
    !value.toLowerCase().startsWith(`${protocol}://`)
  ) {
    return rejectUrl(kind, policy, 'malformed');
  }
  const schemeValue = value.slice(protocol.length + 1);
  if (!schemeValue || !schemeValue.split(/[?#]/u, 1)[0]?.trim()) {
    return rejectUrl(kind, policy, 'empty-target');
  }
  if (protocol === 'cid' && /\s/u.test(schemeValue)) {
    return rejectUrl(kind, policy, 'invalid-content-id');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return rejectUrl(kind, policy, 'malformed');
  }
  if (url.protocol !== `${protocol}:`) {
    return rejectUrl(kind, policy, 'protocol');
  }
  if ((protocol === 'http' || protocol === 'https') && !url.hostname) {
    return rejectUrl(kind, policy, 'missing-hostname');
  }
  if (!policy.allowCredentials && (url.username || url.password)) {
    return rejectUrl(kind, policy, 'credentials');
  }

  return value;
}

export interface SanitizeEmailUrlOptions {
  kind: EmailUrlKind;
  policy?: EmailUrlPolicy;
}

export function sanitizeEmailUrl(
  value: string | undefined,
  options: SanitizeEmailUrlOptions,
): string | undefined {
  const base = resolvedStrictEmailSecurityPolicy[options.kind];
  return validateUrl(
    value,
    options.kind,
    resolveUrlPolicy(base, options.policy),
  );
}

export function useEmailUrlPolicy(
  kind: EmailUrlKind,
  policy?: EmailUrlPolicy,
): (value: string | undefined) => string | undefined {
  const securityPolicy = useContext(EmailSecurityPolicyContext);
  const resolved = useMemo(
    () => resolveUrlPolicy(securityPolicy[kind], policy),
    [kind, policy, securityPolicy],
  );
  return (value) => validateUrl(value, kind, resolved);
}

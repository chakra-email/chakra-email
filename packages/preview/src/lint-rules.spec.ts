import { readFileSync } from 'node:fs';
import {
  getLintRules,
  isLintRuleId,
  normalizeLintRules,
  previewLintRules,
  resolveLintFinding,
} from './lint-rules.js';

describe('shared lint rule registry', () => {
  it('registers every existing rule once, with categories, passing titles and defaults', () => {
    const ids = previewLintRules.map((rule) => rule.id);
    expect(ids).toHaveLength(32);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rule of previewLintRules) {
      expect(rule.title.trim()).not.toBe('');
      expect([
        'markup',
        'accessibility',
        'compatibility',
        'content',
        'deliverability',
        'links',
      ]).toContain(rule.category);
      expect(['error', 'warning', 'info']).toContain(rule.severity);
    }
    for (const file of ['lint-email.ts', 'check-links.ts']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      const usedIds = [
        ...source.matchAll(
          /\bfinding\(\s*(?:undefined|html|body|title|element),\s*'([a-z-]+)'|lintFindingDefaults\(\s*'([a-z-]+)'|ruleId:\s*'([a-z-]+)'/g,
        ),
      ].map((match) => match[1] ?? match[2] ?? match[3]);
      expect(usedIds.length).toBeGreaterThan(0);
      for (const id of usedIds) expect(ids, `${file}: ${id}`).toContain(id);
    }
  });

  it('derives the effective catalog without mutating defaults or caller overrides', () => {
    const overrides = Object.freeze({
      'image-alt': 'warning',
      'document-title': 'off',
    } as const);
    const catalog = getLintRules(overrides);
    expect(catalog.find((rule) => rule.id === 'image-alt')?.severity).toBe(
      'warning',
    );
    expect(catalog.some((rule) => rule.id === 'document-title')).toBe(false);
    expect(
      previewLintRules.find((rule) => rule.id === 'image-alt')?.severity,
    ).toBe('error');
    const first = catalog[0];
    if (!first) throw new Error('Missing rule catalog');
    first.title = 'Changed by consumer';
    expect(getLintRules()[0]?.title).not.toBe('Changed by consumer');
    expect(Object.isFrozen(previewLintRules)).toBe(true);
    expect(previewLintRules.every((rule) => Object.isFrozen(rule))).toBe(true);
  });

  it('clones and freezes normalized rule overrides', () => {
    const input = { 'image-alt': 'warning' };
    const normalized = normalizeLintRules(input);
    input['image-alt'] = 'error';
    expect(normalized['image-alt']).toBe('warning');
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(normalizeLintRules(undefined)).toEqual({});
  });

  it('rejects unknown IDs, reserved properties, invalid levels and non-record inputs', () => {
    expect(isLintRuleId('image-alt')).toBe(true);
    expect(isLintRuleId('toString')).toBe(false);
    expect(() => normalizeLintRules({ unknown: 'off' })).toThrow(
      "Unknown lint rule 'unknown' in lint.rules.",
    );
    expect(() => normalizeLintRules(JSON.parse('{"__proto__":"off"}'))).toThrow(
      'Unknown lint rule',
    );
    expect(() => normalizeLintRules({ 'image-alt': 'warn' })).toThrow(
      'Invalid severity',
    );
    for (const input of [null, [], 42, 'off', new Date()]) {
      expect(() => normalizeLintRules(input)).toThrow(
        'lint.rules must be an object',
      );
    }
  });

  it('resolves findings through registered defaults and refuses unregistered IDs', () => {
    const finding = {
      ruleId: 'image-alt',
      message: 'Missing alt.',
      suggestion: 'Add alt.',
    };
    expect(resolveLintFinding(finding, {})).toMatchObject({
      category: 'accessibility',
      severity: 'error',
    });
    expect(resolveLintFinding(finding, { 'image-alt': 'info' })?.severity).toBe(
      'info',
    );
    expect(resolveLintFinding(finding, { 'image-alt': 'off' })).toBeUndefined();
    expect(() =>
      resolveLintFinding({ ...finding, ruleId: 'missing' }, {}),
    ).toThrow('Unregistered lint rule: missing');
  });
});

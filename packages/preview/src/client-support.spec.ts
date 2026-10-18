import {
  clientSupportReviewed,
  knownBreakages,
  previewClients,
} from './client-support.js';
import { isLintRuleId } from './lint-rules.js';
import { lintEmail } from './lint-email.js';
import { compatibilityReferenceForRule } from './compatibility.js';

describe('curated email client breakages', () => {
  it('keeps the eight stable client IDs and meaningful display names', () => {
    expect(Object.keys(previewClients)).toEqual([
      'apple-mail',
      'ios-mail',
      'gmail',
      'gmail-android',
      'outlook-com',
      'outlook-windows',
      'outlook-mac',
      'yahoo',
    ]);
    expect(new Set(Object.values(previewClients)).size).toBe(8);
    for (const name of Object.values(previewClients)) {
      expect(name.trim()).not.toBe('');
    }
    expect(clientSupportReviewed).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('maps only registered rules to nonempty, unique known client IDs', () => {
    expect(Object.keys(knownBreakages)).toHaveLength(11);
    for (const [ruleId, clients] of Object.entries(knownBreakages)) {
      expect(isLintRuleId(ruleId), ruleId).toBe(true);
      expect(compatibilityReferenceForRule(ruleId)?.url, ruleId).toMatch(
        /^https:\/\/www\.caniemail\.com\/features\//,
      );
      expect(clients.length, ruleId).toBeGreaterThan(0);
      expect(new Set(clients).size, ruleId).toBe(clients.length);
      for (const id of clients) {
        expect(Object.hasOwn(previewClients, id), `${ruleId}: ${id}`).toBe(
          true,
        );
      }
    }
    expect(knownBreakages['image-alt']).toBeUndefined();
  });

  it('attaches copied client IDs to mapped findings and leaves other checks unmapped', () => {
    const html =
      '<body><a href="/" style="background:#111;border-radius:8px">Read the release notes</a><img></body>';
    const findings = lintEmail(html).findings;
    const rounded = findings.find(
      (finding) => finding.ruleId === 'css-border-radius',
    );
    expect(rounded?.clients).toEqual(['outlook-windows']);
    expect(
      findings.find((finding) => finding.ruleId === 'image-alt')?.clients,
    ).toBeUndefined();
    rounded?.clients?.push('gmail');
    expect(knownBreakages['css-border-radius']).toEqual(['outlook-windows']);
    expect(
      lintEmail(html, {
        rules: { 'css-border-radius': 'error' },
      }).findings.find((finding) => finding.ruleId === 'css-border-radius'),
    ).toMatchObject({ severity: 'error', clients: ['outlook-windows'] });
    expect(
      lintEmail(html, { rules: { 'css-border-radius': 'off' } }).findings.some(
        (finding) => finding.ruleId === 'css-border-radius',
      ),
    ).toBe(false);
  });

  it('does not turn supported or partial seed results into blanket breakages', () => {
    expect(knownBreakages['css-display-grid']).toEqual(['outlook-windows']);
    expect(knownBreakages['css-font-face']).not.toContain('outlook-windows');
    expect(knownBreakages['css-position']).not.toContain('yahoo');
    expect(knownBreakages['external-stylesheet']).not.toContain(
      'outlook-windows',
    );
    expect(knownBreakages['unsupported-form']).toEqual(['outlook-windows']);
  });

  it('retains clear classic Outlook CSS failures and media playback failures', () => {
    expect(knownBreakages['css-border-radius']).toEqual(['outlook-windows']);
    expect(knownBreakages['css-background-image']).toEqual(['outlook-windows']);
    expect(knownBreakages['unsupported-video']).toContain('outlook-com');
    expect(knownBreakages['unsupported-audio']).toContain('outlook-com');
  });

  it('freezes both the catalog and nested arrays against consumer mutation', () => {
    expect(Object.isFrozen(previewClients)).toBe(true);
    expect(Object.isFrozen(knownBreakages)).toBe(true);
    for (const clients of Object.values(knownBreakages)) {
      expect(Object.isFrozen(clients)).toBe(true);
    }
  });
});

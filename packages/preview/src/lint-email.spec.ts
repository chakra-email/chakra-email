import { lintEmail, lintRenderedEmail } from './lint-email.js';
import { getLintRules } from './lint-rules.js';

describe('lintRenderedEmail', () => {
  it('preserves the convenience API while exposing the rules actually evaluated', () => {
    const html = '<p>Hello</p>';
    const result = lintEmail(html, { text: 'Hello', subject: 'Welcome' });
    expect(result.findings).toEqual(lintRenderedEmail(html, 'Hello'));
    expect(result.rulesRun).toEqual(
      getLintRules()
        .filter((rule) => rule.category !== 'links')
        .map((rule) => rule.id),
    );
    expect(new Set(result.rulesRun).size).toBe(result.rulesRun.length);
    expect(result.rulesRun).toContain('plain-text-content');
    expect(lintEmail(html).rulesRun).not.toContain('plain-text-content');
    expect(result.rulesRun.some((id) => id.startsWith('link-'))).toBe(false);
    for (const finding of result.findings)
      expect(result.rulesRun).toContain(finding.ruleId);
  });

  it('applies overrides to element, parser, metadata and message findings before sorting', () => {
    const html = `<div id="a" id="b"><img src="http://example.org/image.png">${'x'.repeat(103 * 1024)}</div>`;
    const result = lintEmail(html, {
      text: '',
      rules: {
        'image-alt': 'info',
        'insecure-url': 'error',
        'valid-html': 'off',
        'document-title': 'off',
        'plain-text-content': 'off',
        'message-size': 'error',
      },
    });
    expect(
      result.findings.find((finding) => finding.ruleId === 'image-alt')
        ?.severity,
    ).toBe('info');
    expect(
      result.findings.find((finding) => finding.ruleId === 'insecure-url')
        ?.severity,
    ).toBe('error');
    expect(
      result.findings.find((finding) => finding.ruleId === 'message-size')
        ?.severity,
    ).toBe('error');
    expect(result.findings[0]?.severity).toBe('error');
    for (const id of ['valid-html', 'document-title', 'plain-text-content']) {
      expect(result.rulesRun).not.toContain(id);
      expect(result.findings.some((finding) => finding.ruleId === id)).toBe(
        false,
      );
    }
    expect(
      lintRenderedEmail(html, '').find(
        (finding) => finding.ruleId === 'image-alt',
      )?.severity,
    ).toBe('error');
  });

  it('reports passing static checks even when there are no findings', () => {
    const rules = Object.fromEntries(
      getLintRules().map((rule) => [rule.id, 'off' as const]),
    );
    const result = lintEmail('<p>Hello</p>', {
      rules: { ...rules, 'message-size': 'warning' },
    });
    expect(result).toEqual({ findings: [], rulesRun: ['message-size'] });
  });

  it('rejects invalid overrides in the programmatic API', () => {
    expect(() =>
      lintEmail('<p>Hello</p>', { rules: { missing: 'off' } }),
    ).toThrow("Unknown lint rule 'missing'");
  });
  it('accepts a complete, email-safe document', () => {
    const findings = lintRenderedEmail(
      `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width">
          <title>Welcome</title>
        </head>
        <body>
          <div aria-hidden="true" style="display:none">A useful preview.</div>
          <img src="https://example.com/logo.png" alt="Example" width="120" height="40">
          <a href="https://example.com">Open account</a>
        </body>
      </html>`,
      'Welcome. Open account.',
    );

    expect(findings).toEqual([]);
  });

  it('reports compatibility, accessibility, and deliverability problems', () => {
    const findings = lintRenderedEmail(
      `<!doctype html>
      <html>
        <head>
          <style>@font-face { font-family: Example; src: url(example.woff2); }</style>
          <link rel="stylesheet" href="http://example.com/email.css">
        </head>
        <body style="display:grid;position:fixed;background-image:url(hero.png)">
          <img src="http://example.com/logo.png">
          <svg><path></path></svg>
          <button>Buy now</button>
          <form><input></form>
          <script>alert("no")</script>
        </body>
      </html>`,
      'Buy now',
    );
    const rules = findings.map((finding) => finding.ruleId);

    expect(rules).toEqual(
      expect.arrayContaining([
        'content-type-meta',
        'css-background-image',
        'css-display-grid',
        'css-font-face',
        'css-position',
        'document-language',
        'document-title',
        'external-stylesheet',
        'image-alt',
        'image-dimensions',
        'insecure-url',
        'preview-text',
        'unsupported-button',
        'unsupported-form',
        'unsupported-script',
        'unsupported-svg',
        'viewport-meta',
      ]),
    );
    expect(findings[0]?.severity).toBe('error');
    expect(
      findings.find((finding) => finding.ruleId === 'unsupported-svg')
        ?.compatibility,
    ).toEqual({
      feature: 'Embedded SVG image',
      source: 'Can I Email',
      url: 'https://www.caniemail.com/features/html-svg/',
    });
    expect(
      findings.find((finding) => finding.ruleId === 'image-alt'),
    ).toMatchObject({
      category: 'accessibility',
      element: '<img>',
      line: 8,
      severity: 'error',
    });
  });

  it('reports malformed markup with source coordinates', () => {
    const findings = lintRenderedEmail(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Test</title></head><body><div aria-hidden="true" style="display:none">Preview</div><div id="first" id="second">Broken</div></body></html>',
      'Test',
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        category: 'markup',
        ruleId: 'valid-html',
        severity: 'error',
      }),
    );
  });

  it('warns about empty plain text and oversized markup', () => {
    const findings = lintRenderedEmail(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Large</title></head><body><div aria-hidden="true" style="display:none">Preview</div>${'x'.repeat(103 * 1024)}</body></html>`,
      '   ',
    );

    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(['message-size', 'plain-text-content']),
    );
  });
});

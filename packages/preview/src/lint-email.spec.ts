import { lintRenderedEmail } from './lint-email.js';

describe('lintRenderedEmail', () => {
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
        'css-layout',
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
      findings.find((finding) => finding.ruleId === 'image-alt'),
    ).toMatchObject({
      category: 'accessibility',
      element: '<img>',
      line: 7,
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

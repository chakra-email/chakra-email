import { parse } from 'parse5';
import {
  extractPreviewText,
  lintEmail,
  lintRenderedEmail,
} from './lint-email.js';
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
    expect(
      result.rulesRun.some((id) =>
        getLintRules().some(
          (rule) => rule.id === id && rule.category === 'links',
        ),
      ),
    ).toBe(false);
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
          <meta name="color-scheme" content="light dark">
          <title>Welcome</title>
        </head>
        <body>
          <div aria-hidden="true" style="display:none">A useful preview of this email and its account updates.</div>
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

describe('design-handoff lint checks', () => {
  const hasRule = (html: string, ruleId: string, subject?: string) =>
    lintEmail(html, { subject }).findings.some(
      (finding) => finding.ruleId === ruleId,
    );

  it.each([
    '[Mailing address — owner approval required]',
    '{{ firstName }}',
    'TODO: complete this',
    'tbd',
    'XXX',
    'Lorem ipsum',
    'Please [add your name] here',
    '<span>Lo</span>rem <b>ipsum</b>',
    '<span>Lorem </span><span>ipsum</span>',
  ])('finds visible placeholders in %s', (content) => {
    const findings = lintEmail(`<p>${content}</p>`).findings.filter(
      (finding) => finding.ruleId === 'placeholder-text',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: 'content',
      severity: 'warning',
      suggestion: 'Replace placeholder text before sending.',
      element: '<p>',
    });
  });

  it.each([
    '<p>[1] and [ab]</p>',
    '<a href="https://example.com">[docs]</a>',
    '<a href="https://example.com"><span>[docs]</span></a>',
    '<p>[docs](https://example.com)</p>',
    '<style>/* TODO [placeholder] */</style><p>Finished</p>',
    '<head><title>TODO {{subject}}</title></head><body>Finished</body>',
    '<!--[if mso]><p>TODO [placeholder]</p><![endif]--><p>Finished</p>',
    '<div hidden>TODO</div><p>Finished</p>',
    '<div style="display:none">TODO</div><p>Finished</p>',
    '<p>Methodology and extracurricular activities</p>',
  ])('ignores non-placeholder and non-visible content in %s', (html) => {
    expect(hasRule(html, 'placeholder-text')).toBe(false);
  });

  it('checks hidden preheaders and removes padding before extracting or checking their length', () => {
    const html =
      '<div aria-hidden="true" style="mso-hide:all">  Hello\n  world. &zwnj;&nbsp;&zwnj;&nbsp; </div>';
    expect(extractPreviewText(parse(html))).toBe('Hello world.');
    expect(extractPreviewText(parse('<p>Body only</p>'))).toBeUndefined();
    expect(
      extractPreviewText(
        parse(
          '<div aria-hidden="true" style="display:none">&zwnj;&nbsp;</div>',
        ),
      ),
    ).toBeUndefined();
    expect(
      hasRule(
        '<div aria-hidden="true" style="display:none">{{ name }}&zwnj;&nbsp;</div>',
        'placeholder-text',
      ),
    ).toBe(true);
    expect(
      hasRule(
        '<div aria-hidden="true" style="display:none">&zwnj;&nbsp;</div>',
        'placeholder-text',
      ),
    ).toBe(false);
  });

  it.each([39, 40, 150, 151])(
    'checks the preheader length boundary at %s characters',
    (length) => {
      const html = `<div aria-hidden="true" style="display:none">${'a'.repeat(length)}${'&zwnj;&nbsp;'.repeat(100)}</div>`;
      expect(hasRule(html, 'preview-text-length')).toBe(
        length < 40 || length > 150,
      );
    },
  );

  it('reports a missing preheader as missing and too short', () => {
    expect(hasRule('<p>Hello</p>', 'preview-text-length')).toBe(true);
    expect(hasRule('<p>Hello</p>', 'preview-text')).toBe(true);
  });

  it('checks rounded anchors with background colors, allowing VML fallbacks and other elements', () => {
    const button =
      '<a href="https://example.com" style="background:#111;border-radius:999px">Open account</a>';
    expect(hasRule(button, 'css-border-radius')).toBe(true);
    expect(
      hasRule(
        '<!--[if mso]><v:roundrect arcsize="50%"><![endif]-->' + button,
        'css-border-radius',
      ),
    ).toBe(false);
    expect(
      hasRule(
        '<td style="background:#111;border-radius:999px">Content</td>',
        'css-border-radius',
      ),
    ).toBe(false);
    expect(
      hasRule('<a style="border-radius:999px">Open</a>', 'css-border-radius'),
    ).toBe(false);
    expect(
      hasRule(
        '<a style="background-color:transparent;border-radius:999px">Open</a>',
        'css-border-radius',
      ),
    ).toBe(false);
    expect(
      hasRule(
        '<a style="background-color:rgb(0,0,0);border-radius:4px">Open</a>',
        'css-border-radius',
      ),
    ).toBe(true);
    expect(
      hasRule(
        '<style>/* <v:roundrect> */</style>' + button,
        'css-border-radius',
      ),
    ).toBe(true);
    expect(
      hasRule(
        '<a style="background:url(image.png);border-radius:4px">Open</a>',
        'css-border-radius',
      ),
    ).toBe(false);
    expect(
      lintEmail(button).findings.find(
        (finding) => finding.ruleId === 'css-border-radius',
      )?.compatibility?.url,
    ).toBe('https://www.caniemail.com/features/css-border-radius/');
  });

  it('checks color-scheme metadata case-insensitively', () => {
    expect(hasRule('<p>Hello</p>', 'color-scheme-meta')).toBe(true);
    expect(
      hasRule(
        '<meta name="COLOR-SCHEME" content="light dark"><p>Hello</p>',
        'color-scheme-meta',
      ),
    ).toBe(false);
  });

  it('evaluates subject length only when a subject is supplied', () => {
    expect(hasRule('<p>Hello</p>', 'subject-length', 'a'.repeat(60))).toBe(
      false,
    );
    expect(hasRule('<p>Hello</p>', 'subject-length', 'a'.repeat(61))).toBe(
      true,
    );
    expect(hasRule('<p>Hello</p>', 'subject-length', '😀'.repeat(60))).toBe(
      false,
    );
    expect(lintEmail('<p>Hello</p>').rulesRun).not.toContain('subject-length');
    expect(lintEmail('<p>Hello</p>', { subject: '' }).rulesRun).toContain(
      'subject-length',
    );
  });

  it.each([
    '',
    'Click here',
    'HERE',
    'link',
    'read more',
    'more',
    '<img src="image.png" alt="">',
  ])('finds ambiguous accessible link text: %s', (text) => {
    expect(
      hasRule(`<a href="https://example.com">${text}</a>`, 'link-text'),
    ).toBe(true);
  });

  it.each([
    '<a href="https://example.com">Read the release notes</a>',
    '<a href="https://example.com"><img src="image.png" alt="Read the release notes"></a>',
    '<a href="https://example.com" aria-label="Read the release notes">Click here</a>',
    '<p id="label">Read the release notes</p><a href="https://example.com" aria-labelledby="label">Here</a>',
    '<a name="bookmark"></a>',
    '<a href="/" aria-label="">Read the release notes</a>',
    '<a href="/" title="Read the release notes"></a>',
  ])('accepts descriptive links and named anchors: %s', (html) => {
    expect(hasRule(html, 'link-text')).toBe(false);
  });

  it('does not use hidden descendants as a link name', () => {
    expect(
      hasRule('<a href="/"><span hidden>Release notes</span></a>', 'link-text'),
    ).toBe(true);
    expect(
      hasRule(
        '<a href="/"><span style="display:none">Release notes</span></a>',
        'link-text',
      ),
    ).toBe(true);
  });

  it('applies overrides to all six new rules, and removes disabled rules from rulesRun', () => {
    const html =
      '<p>TODO</p><a href="/" style="background-color:black;border-radius:3px">Click here</a>';
    const ids = [
      'placeholder-text',
      'css-border-radius',
      'color-scheme-meta',
      'subject-length',
      'preview-text-length',
      'link-text',
    ];
    const result = lintEmail(html, {
      subject: 'a'.repeat(61),
      rules: Object.fromEntries(ids.map((id) => [id, 'error' as const])),
    });
    for (const id of ids) {
      expect(
        result.findings.find((finding) => finding.ruleId === id)?.severity,
      ).toBe('error');
      expect(result.rulesRun).toContain(id);
    }
    const disabled = lintEmail(html, {
      subject: 'a'.repeat(61),
      rules: Object.fromEntries(ids.map((id) => [id, 'off' as const])),
    });
    for (const id of ids) {
      expect(disabled.findings.some((finding) => finding.ruleId === id)).toBe(
        false,
      );
      expect(disabled.rulesRun).not.toContain(id);
    }
  });
});

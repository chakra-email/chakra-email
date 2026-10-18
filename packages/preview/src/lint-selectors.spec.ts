// @vitest-environment jsdom
/// <reference lib="dom" />
import { lintEmail } from './lint-email.js';

describe('rendered finding selectors', () => {
  it.each([
    '<!doctype html><html><head><title></title><style>@font-face {font-family:Example}</style></head><body><table><tr><td><img src="http://example.com/a.png"><img src="http://example.com/b.png"></td></tr></table><p>TODO</p></body></html>',
    '<body><div id="card"><img><a href="/">Here</a></div></body>',
    '<body><div id="duplicate"><img></div><div id="duplicate"><img></div></body>',
    '<body><div id="1:card.section"><img id="-1"></div><img id="-"></body>',
    '<p><img>TODO</p>',
  ])('matches exactly one element for every element finding: %s', (html) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const findings = lintEmail(html).findings.filter(
      (finding) => finding.element,
    );
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.selector, finding.ruleId).toBeTruthy();
      const matches = document.querySelectorAll(finding.selector ?? '');
      expect(matches.length, `${finding.ruleId}: ${finding.selector}`).toBe(1);
      expect(`<${matches[0]?.tagName.toLowerCase()}>`).toBe(finding.element);
    }
  });

  it('prefers unique IDs on the element or its ancestor, counting only element siblings', () => {
    const findings = lintEmail(
      '<body>Text<!--comment--><div id="card">Text<img><a href="/">Here</a></div><img></body>',
    ).findings;
    expect(
      findings.find((finding) => finding.ruleId === 'link-text')?.selector,
    ).toBe('#card > a:nth-child(2)');
    expect(
      findings
        .filter((finding) => finding.ruleId === 'image-alt')
        .map((finding) => finding.selector),
    ).toEqual(['#card > img:nth-child(1)', 'body > img:nth-child(2)']);
  });
});

import { formatHtmlForDisplay, parseHtmlIndent } from './html-display';

describe('HTML display formatting', () => {
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table role="presentation"><tbody><tr><td>Hello &amp; welcome</td></tr></tbody></table></body></html>';

  it.each([2, 4, 8] as const)(
    'indents authored nesting with %i spaces',
    (width) => {
      const display = formatHtmlForDisplay(html, width);
      expect(display.lines).toEqual([
        '<!DOCTYPE html>',
        '<html>',
        ' '.repeat(width) + '<head>',
        ' '.repeat(width * 2) + '<meta charset="utf-8">',
        ' '.repeat(width) + '</head>',
        ' '.repeat(width) + '<body>',
        ' '.repeat(width * 2) + '<table role="presentation">',
        ' '.repeat(width * 3) + '<tbody>',
        ' '.repeat(width * 4) + '<tr>',
        ' '.repeat(width * 5) + '<td>Hello &amp; welcome</td>',
        ' '.repeat(width * 4) + '</tr>',
        ' '.repeat(width * 3) + '</tbody>',
        ' '.repeat(width * 2) + '</table>',
        ' '.repeat(width) + '</body>',
        '</html>',
      ]);
      expect(display.lineForSourcePosition(1, html.indexOf('<td>') + 1)).toBe(
        10,
      );
    },
  );

  it('normalizes existing tag-only indentation without leaving blank lines', () => {
    expect(
      formatHtmlForDisplay('<table>\n<tr>\n<td>Hello</td>\n</tr>\n</table>', 4)
        .lines,
    ).toEqual([
      '<table>',
      '    <tr>',
      '        <td>Hello</td>',
      '    </tr>',
      '</table>',
    ]);
  });

  it('indents full documents with whitespace merged across body/html closing tags', () => {
    // parse5 merges the whitespace before/after </body> into one text node,
    // whose source location includes the closing tag itself.
    const source =
      '<!doctype html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n<div>Welcome</div>\n</body>\n</html>\n';
    const display = formatHtmlForDisplay(source, 2);
    expect(display.lines).toEqual([
      '<!doctype html>',
      '<html>',
      '  <head>',
      '    <meta charset="utf-8">',
      '  </head>',
      '  <body>',
      '    <div>Welcome</div>',
      '  </body>',
      '</html>',
    ]);
    expect(display.lineForSourcePosition(5)).toBe(7);
    expect(display.lineForSourcePosition(6)).toBe(8);
  });

  it('keeps inline text, literal entities, quoted greater-than signs and attribute values intact', () => {
    const fragment =
      '<div><p title="a > b" data-value=\'a  b\'>Hello <strong>Ada</strong> &amp; welcome!</p><img src="a?b=1&amp;c=2" /></div>';
    const display = formatHtmlForDisplay(fragment, 2);
    expect(display.lines).toEqual([
      '<div>',
      '  <p title="a > b" data-value=\'a  b\'>Hello <strong>Ada</strong> &amp; welcome!</p>',
      '  <img src="a?b=1&amp;c=2" />',
      '</div>',
    ]);
  });

  it.each([
    'pre',
    'textarea',
    'script',
    'style',
    'title',
    'xmp',
    'iframe',
    'noembed',
    'noframes',
  ])(
    'preserves the original %s section, including significant whitespace',
    (tag) => {
      const section = `<${tag}>  first\r\n    second <span>&amp;</span>\r\n</${tag}>`;
      const source = `<html><head></head><body>${section}</body></html>`;
      const display = formatHtmlForDisplay(source, 4);
      expect(display.lines.join('\n')).toContain(
        '    ' + section.replaceAll('\r\n', '\n'),
      );
      const sourceLine = source.split('\r\n')[1] ?? '';
      const line = display.lineForSourcePosition(
        2,
        sourceLine.indexOf('second') + 1,
      );
      expect(line).toBeDefined();
      expect(display.lines[(line ?? 1) - 1]).toContain('second');
    },
  );

  it('preserves conditional comments, VML, and template content without inventing implicit tags', () => {
    const comment =
      '<!--[if mso]><v:rect style="width:100px"><v:textbox>MSO</v:textbox></v:rect><![endif]-->';
    const source = `<table>${comment}<tr><td>Cell</td></tr></table><template><div><p>Hidden</p></div></template>`;
    const display = formatHtmlForDisplay(source, 2).lines.join('\n');
    expect(display).toContain('  ' + comment);
    expect(display).not.toContain('<tbody>');
    expect(display).toContain(
      '<template>\n  <div>\n    <p>Hidden</p>\n  </div>\n</template>',
    );
  });

  it('does not drop source ignored or reparented by HTML error recovery', () => {
    for (const source of [
      '<table>orphan text<tr><td>Cell</td></tr></table>',
      '<div></ignored><p>Text</p></div>',
      '<p><b>A<i>B</b>C</i></p>',
      '<ul><li>First<li>Second</ul>',
      '<div><svg><path d="M 0 0" /></svg></div>',
    ]) {
      expect(
        formatHtmlForDisplay(source, 2).lines.join('').replace(/\s/gu, ''),
      ).toBe(source.replace(/\s/gu, ''));
    }
  });

  it('maps original CRLF lines and columns to their formatted locations', () => {
    const source =
      '<body>\r\n<table><tr><td><img src="x"></td></tr></table>\r\n</body>';
    const display = formatHtmlForDisplay(source, 2);
    const line = display.lineForSourcePosition(2, '<table><tr><td>'.length + 1);
    expect(display.lines[(line ?? 1) - 1]).toContain('<img src="x">');
    expect(display.lineForSourcePosition(2)).toBe(2);
    expect(display.lineForSourcePosition(0)).toBeUndefined();
    expect(display.lineForSourcePosition(99)).toBeUndefined();
    expect(display.lineForSourcePosition(1, 0)).toBeUndefined();
    expect(display.lineForSourcePosition(1.5)).toBeUndefined();
  });

  it('offers unchanged original lines and safely handles empty or oversized/deep input', () => {
    const original = '<body>\r\n  <p>Hello</p>\r\n</body>';
    expect(formatHtmlForDisplay(original, 0).lines).toEqual(
      original.split('\r\n'),
    );
    expect(formatHtmlForDisplay(original, 0).lineForSourcePosition(2, 10)).toBe(
      2,
    );
    expect(
      formatHtmlForDisplay(original, 0).lineForSourcePosition(99),
    ).toBeUndefined();
    expect(formatHtmlForDisplay('', 2).lines).toEqual(['']);
    const huge = 'x'.repeat(2_000_001);
    expect(formatHtmlForDisplay(huge, 8).lines).toEqual([huge]);
    const deep = '<div>'.repeat(150) + '<p>Deep</p>' + '</div>'.repeat(150);
    expect(formatHtmlForDisplay(deep, 8).lines).toEqual([deep]);
    const expanded =
      '<div>'.repeat(100) + '<div></div>'.repeat(10_000) + '</div>'.repeat(100);
    expect(formatHtmlForDisplay(expanded, 8).lines).toEqual([expanded]);
  });
});

describe('HTML indentation preferences', () => {
  it.each(['0', '2', '4', '8'])('accepts the saved width %s', (width) => {
    expect(parseHtmlIndent(width)).toBe(Number(width));
  });
  it.each([null, undefined, '', '3', '1000', '-1', 'NaN', '4px', '__proto__'])(
    'defaults invalid settings to 2 spaces (%s)',
    (value) => {
      expect(parseHtmlIndent(value)).toBe(2);
    },
  );
});

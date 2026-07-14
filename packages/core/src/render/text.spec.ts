import { describe, expect, it } from 'vitest';
import { toPlainText } from './text';

describe('toPlainText hidden elements', () => {
  it('removes hidden void elements without consuming the content that follows', () => {
    expect(
      toPlainText(
        '<p>Before<img src="tracking.gif" style="display:none">After</p>' +
          '<p>Still visible</p>'
      )
    ).toBe('BeforeAfter\n\nStill visible');
  });

  it('removes a hidden br without introducing a line break', () => {
    expect(toPlainText('<p>Before<br style="display: none">After</p>')).toBe('BeforeAfter');
  });

  it('does not confuse custom properties or values with display:none', () => {
    expect(
      toPlainText(
        '<p style="--display:none;color:red">Custom property stays</p>' +
          '<p style="background:url(display:none)">Value stays</p>'
      )
    ).toBe('Custom property stays\n\nValue stays');
  });

  it('recognizes display:none as a complete case-insensitive declaration', () => {
    expect(
      toPlainText(
        '<p style="color:red; DISPLAY: none !important; margin:0">Hidden</p>' +
          '<p>Visible</p>'
      )
    ).toBe('Visible');
  });
});

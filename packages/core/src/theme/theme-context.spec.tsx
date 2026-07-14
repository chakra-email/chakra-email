import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider, useTheme } from './theme-context';

function ColorProbe({ token }: { token: string }) {
  const theme = useTheme();
  const brand = theme.colors?.brand as Record<string, string> | undefined;
  const accent = theme.colors?.accent as Record<string, string> | undefined;

  return (
    <span
      data-brand={brand?.[token]}
      data-accent={accent?.[token]}
      data-white={theme.colors?.white as string}
    />
  );
}

describe('ThemeProvider', () => {
  it('merges the root provider theme over the default theme', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={{ colors: { brand: { 500: '#111111' } } }}>
        <ColorProbe token="500" />
      </ThemeProvider>,
    );

    expect(html).toContain('data-brand="#111111"');
    expect(html).toContain('data-white="#ffffff"');
  });

  it('composes nested provider themes over the parent theme instead of resetting', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider
        theme={{
          colors: { brand: { 500: '#111111' }, accent: { 500: '#222222' } },
        }}
      >
        <ThemeProvider theme={{ colors: { brand: { 500: '#333333' } } }}>
          <ColorProbe token="500" />
        </ThemeProvider>
      </ThemeProvider>,
    );

    // Inner override wins, parent-only customization survives, defaults remain.
    expect(html).toContain('data-brand="#333333"');
    expect(html).toContain('data-accent="#222222"');
    expect(html).toContain('data-white="#ffffff"');
  });

  it('exposes the parent theme unchanged when a nested provider has no theme', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={{ colors: { brand: { 500: '#111111' } } }}>
        <ThemeProvider>
          <ColorProbe token="500" />
        </ThemeProvider>
      </ThemeProvider>,
    );

    expect(html).toContain('data-brand="#111111"');
  });
});

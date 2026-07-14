import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Box, Hr, Stack, Text } from './index';

/**
 * Components must render with the default theme when no ChakraEmailProvider /
 * ThemeProvider wraps them, because the theme context defaults to
 * `defaultTheme` (see ../theme/theme-context.tsx).
 */
describe('rendering without a ThemeProvider', () => {
  it('resolves spacing tokens through the default space scale', () => {
    const html = renderToStaticMarkup(<Box p={4}>Padded</Box>);

    expect(html).toContain('padding:16px');
    expect(html).toContain('Padded');
  });

  it('resolves color tokens from the default theme', () => {
    const html = renderToStaticMarkup(<Box color="gray.700">Gray copy</Box>);

    // gray.700 in src/theme/default-theme.ts
    expect(html).toContain('color:#2D3748');
  });

  it('resolves Stack spacing through the default space scale', () => {
    const html = renderToStaticMarkup(
      <Stack spacing={2}>
        <Text>First</Text>
        <Text>Second</Text>
      </Stack>
    );

    // spacing={2} -> 8px spacer between items, not a raw 2px
    expect(html).toContain('height:8px');
    expect(html).not.toContain('height:2px');
  });

  it('resolves the Hr border color to the default gray.200 token', () => {
    const html = renderToStaticMarkup(<Hr />);

    expect(html).toContain('border-top:1px solid #E2E8F0');
  });
});

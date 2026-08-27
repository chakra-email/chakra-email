import { describe, expect, it } from 'vitest';
import { render } from '../render/index.js';
import { ThemeProvider } from '../theme/index.js';
import { Font } from './Font.js';
import { Head } from './Head.js';
import { Html } from './Html.js';

describe('Font', () => {
  it('resolves theme font tokens into the email-wide stack', async () => {
    const html = await render(
      <ThemeProvider
        theme={{
          fonts: {
            display: 'Aptos Display, Arial, sans-serif',
            fallback: 'Georgia, serif',
          },
        }}
      >
        <Html>
          <Head>
            <Font fontFamily="display" fallbackFontFamily="fallback" />
          </Head>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain(
      'font-family: Aptos Display, Arial, sans-serif, Georgia, serif',
    );
    expect(html).not.toContain('@font-face');
  });

  it('emits a safe web-font declaration with themed fallbacks', async () => {
    const html = await render(
      <ThemeProvider theme={{ fonts: { fallback: 'Arial, sans-serif' } }}>
        <Html>
          <Head>
            <Font
              fontFamily="Inter"
              fallbackFontFamily="fallback"
              fontWeight={600}
              webFont={{
                url: 'https://cdn.example.com/inter.woff2',
                format: 'woff2',
              }}
            />
          </Head>
        </Html>
      </ThemeProvider>,
    );

    expect(html).toContain('@font-face');
    expect(html).toContain('font-family: "Inter"');
    expect(html).toContain('mso-font-alt: "Arial"');
    expect(html).toContain(
      'src: url("https://cdn.example.com/inter.woff2") format("woff2")',
    );
    expect(html).toContain('font-family: "Inter", Arial, sans-serif');
  });

  it('rejects unsafe or non-HTTP font sources', async () => {
    await expect(
      render(
        <Html>
          <Head>
            <Font
              fontFamily="Inter"
              webFont={{ url: 'javascript:alert(1)', format: 'woff2' }}
            />
          </Head>
        </Html>,
      ),
    ).rejects.toThrow(/absolute HTTP\(S\) URL/);

    await expect(
      render(
        <Html>
          <Head>
            <Font fontFamily={'Inter;}</style>'} />
          </Head>
        </Html>,
      ),
    ).rejects.toThrow(/unsafe CSS value/);
  });
});

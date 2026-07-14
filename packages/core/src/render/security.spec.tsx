import { describe, expect, it } from 'vitest';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Pre,
  Preview,
  Text,
} from '../components';
import { ThemeProvider } from '../theme';
import { pretty } from './pretty';
import { render, renderPlainText } from './render';

/**
 * Attribute/element breakout payload. Each injection point gets a unique id so
 * assertions can tell exactly which one leaked or survived.
 */
function payload(id: string): string {
  return `"><script>alert(${id})</script>`;
}

const themeWithHostileToken = {
  colors: {
    danger: payload('theme'),
  },
};

function HostileEmail() {
  return (
    <ThemeProvider theme={themeWithHostileToken}>
      <Html>
        <Head>
          <title>Security test</title>
        </Head>
        <Preview>{`Sneak peek ${payload('preview')}`}</Preview>
        <Body>
          <Container>
            <Heading as="h1" color="danger">
              Themed heading
            </Heading>
            <Text style={{ fontFamily: payload('style') }}>Styled text</Text>
            <Text>{`Child content ${payload('children')}`}</Text>
            <Img
              src={`https://example.com/logo.png?q=${payload('imgsrc')}`}
              alt={payload('imgalt')}
            />
            <Link href={`https://example.com/?q=${payload('link')}`}>Click here</Link>
          </Container>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

const injectionIds = ['theme', 'preview', 'style', 'children', 'imgsrc', 'imgalt', 'link'];

function expectEscapedEverywhere(html: string) {
  // No payload may materialize as a real script element or break out of its
  // attribute: the raw output must never contain an unescaped tag open.
  expect(html).not.toMatch(/<script/i);
  expect(html).not.toMatch(/<\/script/i);

  for (const id of injectionIds) {
    // The payload must not appear in raw form anywhere.
    expect(html).not.toContain(payload(id));
    // It must appear in fully escaped form (quotes and angle brackets encoded),
    // proving the value survived rather than being dropped.
    expect(html).toContain(`&quot;&gt;&lt;script&gt;alert(${id})&lt;/script&gt;`);
  }

  // The only raw double quotes allowed are structural (attribute delimiters):
  // an attribute value ending early would leave a bare `">` followed by our
  // script tag, which the assertions above already exclude.
}

describe('render escaping (XSS regression)', () => {
  it('escapes hostile values in every injection point for plain render', async () => {
    const html = await render(<HostileEmail />);
    expectEscapedEverywhere(html);
  });

  it('escapes hostile values when pretty-printing', async () => {
    const html = await render(<HostileEmail />, { pretty: true });
    expectEscapedEverywhere(html);
  });

  it('keeps hostile values inert in plain text output', async () => {
    const text = await renderPlainText(<HostileEmail />);

    // Plain text is not HTML: decoded payloads are inert text. Visible
    // content must survive.
    expect(text).toContain('Child content');
    expect(text).toContain(`alert(children)`);
    // Preview is hidden content and must be stripped entirely.
    expect(text).not.toContain('alert(preview)');
    expect(text).not.toContain('Sneak peek');
    // Image alt text and link hrefs surface as text.
    expect(text).toContain('alert(imgalt)');
    expect(text).toContain('Click here [https://example.com/?q=');
    // Plain text conversion must not resurrect escaped entities into markup
    // that a later naive HTML pass could pick up as an element boundary pair;
    // most importantly it must never contain a full raw document structure.
    expect(text).not.toMatch(/<html|<body|<head/i);
  });

  it('does not reintroduce structure when plain-texting pretty output', async () => {
    const prettyHtml = await render(<HostileEmail />, { pretty: true, plainText: true });
    expect(prettyHtml).toContain('alert(children)');
    expect(prettyHtml).not.toContain('alert(preview)');
    expect(prettyHtml).not.toMatch(/<html|<body|<head/i);
  });
});

describe('pretty placeholder collision safety', () => {
  const marker = '\uE000';

  it('does not corrupt rendered content containing the placeholder character', async () => {
    const html = await render(
      <Html>
        <Body>
          <Text>{`before${marker}0${marker}after`}</Text>
          <Pre>{'UNIQUE_PRE_CONTENT'}</Pre>
        </Body>
      </Html>,
      { pretty: true }
    );

    // Surrounding content survives, the private-use marker is neutralized,
    // and no placeholder bookkeeping leaks into the output.
    expect(html).toContain('before');
    expect(html).toContain('after');
    expect(html).not.toContain(marker);
    expect(html).not.toContain('undefined');
    // The <pre> block is restored exactly once (no duplication into the
    // colliding text node).
    expect(html.split('UNIQUE_PRE_CONTENT').length - 1).toBe(1);
    expect(html).toContain('before0after');
  });

  it('neutralizes raw placeholder markers passed directly to pretty()', () => {
    const withPre = pretty(`<p>a${marker}0${marker}b</p><pre>BLOCK</pre>`);
    expect(withPre).not.toContain(marker);
    expect(withPre.split('BLOCK').length - 1).toBe(1);
    expect(withPre).toContain('<p>a0b</p>');

    const withoutPre = pretty(`<p>a${marker}0${marker}b</p>`);
    expect(withoutPre).not.toContain(marker);
    expect(withoutPre).not.toContain('undefined');
    expect(withoutPre).toContain('<p>a0b</p>');
  });
});

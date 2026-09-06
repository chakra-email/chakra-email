import {
  Body,
  Box,
  Button,
  Container,
  Head,
  Html,
  Hr,
  Blockquote,
  Table,
  TableCell,
  TableRow,
  Text,
} from '../components/index.js';
import { ThemeProvider, type EmailTheme } from '../theme/index.js';
import {
  getEmailStyleProps,
  useChakraStyles,
  useSlotRecipeStyles,
  mergeInlineStyles,
} from '../system/index.js';
import { render, renderEmail, renderPlainText } from './render.js';

const theme: EmailTheme = {
  semanticTokens: {
    colors: {
      bg: { value: { _light: '#ffffff', _dark: '#121212' } },
      fg: { value: { _light: '#222222', _dark: '#eeeeee' } },
      border: { value: { _light: '#cccccc', _dark: '#333333' } },
      accent: { value: { _light: '#ff0000', _dark: '#00ff00' } },
    },
  },
};

function Email() {
  return (
    <ThemeProvider theme={theme}>
      <Html>
        <Head />
        <Body>
          <Container bg="bg" p={4}>
            <Text>Mode test</Text>
            <Button href="https://example.com" bg="bg" color="fg">
              Action
            </Button>
            <Hr />
            <Blockquote>Quote</Blockquote>
            <Table>
              <TableRow>
                <TableCell>Cell</TableCell>
              </TableRow>
            </Table>
          </Container>
        </Body>
      </Html>
    </ThemeProvider>
  );
}

describe('single-pass email color-mode rendering', () => {
  it('keeps light inline fallbacks and emits class-based dark styles in the head', async () => {
    const html = await render(<Email />);
    expect(html).toContain('bgcolor="#ffffff"');
    expect(html).toContain('background-color:#ffffff');
    expect(html).toContain('@media (prefers-color-scheme: dark)');
    expect(html).toContain('background-color: #121212 !important');
    expect(html).toContain('color: #eeeeee !important');
    expect(html).toContain('border-top: 1px solid #333333 !important');
    expect(html).toContain('border-left: 4px solid #333333 !important');
    expect(html).toContain('border: 1px solid #333333 !important');
    expect(html.indexOf('data-chakra-email-color-mode')).toBeLessThan(
      html.indexOf('</head>'),
    );
    expect(html.match(/name="color-scheme"/g)).toHaveLength(1);
    expect(html).not.toMatch(/_dark=|_light=|--ce-/);
  });

  it('supports forced modes with legacy attributes and no conditional stylesheet', async () => {
    const dark = await render(<Email />, { colorMode: 'dark' });
    expect(dark).toContain('bgcolor="#121212"');
    expect(dark).toContain('background-color:#121212');
    expect(dark).toContain('name="color-scheme" content="dark"');
    expect(dark).not.toContain('prefers-color-scheme');
    const light = await render(<Email />, { colorMode: 'light' });
    expect(light).not.toContain('prefers-color-scheme');
    expect(light).toContain('name="color-scheme" content="light"');
  });

  it('keeps rendering single-pass, deterministic and isolated across calls', async () => {
    let renders = 0;
    function Counted() {
      renders++;
      return <Email />;
    }
    const first = await renderEmail(<Counted />);
    expect(renders).toBe(1);
    expect(first.text).not.toContain('ce-mode');
    expect(first.text).toBe(await renderPlainText(<Email />));
    const [again, unrelated] = await Promise.all([
      render(<Email />),
      render(<Box color="#123">Other</Box>),
    ]);
    expect(again).toBe(first.html);
    expect(unrelated).not.toContain('ce-mode');
  });

  it('preserves recipe/instance precedence, class names, and dark slot styles passed through style props', async () => {
    function Custom() {
      const slots = useSlotRecipeStyles('custom');
      const own = useChakraStyles({ color: '#abcdef', _dark: { bg: '#333' } });
      return (
        <>
          <Box className="user-class" style={slots.root}>
            Slot
          </Box>
          <span
            {...getEmailStyleProps(
              mergeInlineStyles(slots.root, own),
              'custom-class',
            )}
          >
            Native
          </span>
        </>
      );
    }
    const html = await render(
      <ThemeProvider
        theme={{
          slotRecipes: {
            custom: {
              slots: ['root'],
              base: { root: { color: 'fg', bg: 'bg' } },
            },
          },
        }}
      >
        <Custom />
      </ThemeProvider>,
    );
    expect(html).toContain('user-class ce-mode-');
    expect(html).toContain('custom-class ce-mode-');
    expect(html).toContain('color: #abcdef !important');
    expect(html).toContain('background-color: #333 !important');
  });

  it('supports nested provider mode overrides and per-instance condition blocks', async () => {
    const html = await render(
      <ThemeProvider theme={theme} colorMode="dark">
        <Body>
          <ThemeProvider colorMode="light">
            <Box bg="bg">Light island</Box>
          </ThemeProvider>
          <Box _dark={{ color: '#fedcba' }}>Dark</Box>
        </Body>
      </ThemeProvider>,
    );
    expect(html).toContain('background-color:#121212');
    expect(html).toContain('background-color:#ffffff');
    expect(html).toContain('color:#fedcba');
    expect(html).not.toContain('prefers-color-scheme');
  });

  it('rejects stylesheet breakouts in dark-only values and respects output limits', async () => {
    await expect(
      render(
        <Box _dark={{ color: '</style><script>alert(1)</script>' }}>
          Unsafe
        </Box>,
      ),
    ).rejects.toThrow('Unsafe CSS');
    await expect(
      renderEmail(<Email />, { outputLimits: { maxHtmlBytes: 100 } }),
    ).rejects.toThrow();
    await expect(
      render(<Email />, { colorMode: 'invalid' as 'dark' }),
    ).rejects.toThrow('color mode');
  });
});

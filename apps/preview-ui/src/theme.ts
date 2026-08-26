import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import type { SystemConfig } from '@chakra-ui/react';

const previewTheme = defineConfig({
  globalCss: {
    'html, body, #app': {
      minWidth: '320px',
      minHeight: '100%',
      margin: '0',
    },
    body: {
      minHeight: '100vh',
      overflow: 'hidden',
      color: 'preview.text',
      background: 'preview.canvas',
      fontFamily: 'preview',
      fontSynthesis: 'none',
      textRendering: 'optimizeLegibility',
    },
    '*': {
      boxSizing: 'border-box',
    },
    'button, select, textarea': {
      font: 'inherit',
    },
  },
  theme: {
    tokens: {
      fonts: {
        preview: {
          value:
            'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        previewMono: {
          value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        },
      },
      shadows: {
        previewPanel: { value: '0 24px 70px rgba(0, 0, 0, 0.28)' },
        previewAccent: { value: '0 7px 22px rgba(53, 185, 151, 0.14)' },
      },
    },
    semanticTokens: {
      colors: {
        preview: {
          canvas: { value: { _light: '#f3f7f6', _dark: '#0d1214' } },
          panel: { value: { _light: '#ffffff', _dark: '#131a1d' } },
          raised: { value: { _light: '#f8faf9', _dark: '#182125' } },
          soft: { value: { _light: '#edf3f1', _dark: '#1d282c' } },
          chrome: {
            value: {
              _light: 'rgba(255, 255, 255, 0.92)',
              _dark: 'rgba(13, 18, 20, 0.92)',
            },
          },
          sidebar: {
            value: {
              _light: 'rgba(247, 250, 249, 0.9)',
              _dark: 'rgba(17, 24, 27, 0.86)',
            },
          },
          panelTranslucent: {
            value: {
              _light: 'rgba(255, 255, 255, 0.94)',
              _dark: 'rgba(19, 26, 29, 0.93)',
            },
          },
          overlay: {
            value: {
              _light: 'rgba(237, 243, 241, 0.82)',
              _dark: 'rgba(24, 33, 37, 0.72)',
            },
          },
          hover: {
            value: {
              _light: 'rgba(23, 33, 31, 0.045)',
              _dark: 'rgba(255, 255, 255, 0.035)',
            },
          },
          border: { value: { _light: '#d7e2df', _dark: '#29363a' } },
          borderStrong: {
            value: { _light: '#b9cbc6', _dark: '#3a4b50' },
          },
          text: { value: { _light: '#17211f', _dark: '#edf4f2' } },
          textSubtle: {
            value: { _light: '#536661', _dark: '#9baba8' },
          },
          textMuted: {
            value: { _light: '#768983', _dark: '#71827f' },
          },
          accent: { value: { _light: '#16866c', _dark: '#63d9bb' } },
          accentStrong: {
            value: { _light: '#16866c', _dark: '#35b997' },
          },
          accentHover: {
            value: { _light: '#14755f', _dark: '#81e3ca' },
          },
          accentInk: { value: { _light: '#ffffff', _dark: '#10201c' } },
          accentSoft: {
            value: {
              _light: 'rgba(22, 134, 108, 0.11)',
              _dark: 'rgba(99, 217, 187, 0.12)',
            },
          },
          danger: { value: { _light: '#c53d35', _dark: '#ff8178' } },
          dangerSoft: {
            value: {
              _light: 'rgba(197, 61, 53, 0.1)',
              _dark: 'rgba(255, 129, 120, 0.12)',
            },
          },
          warning: { value: { _light: '#936000', _dark: '#f4bd6c' } },
          warningSoft: {
            value: {
              _light: 'rgba(147, 96, 0, 0.1)',
              _dark: 'rgba(244, 189, 108, 0.12)',
            },
          },
        },
      },
    },
  },
});

export function createPreviewSystem(theme: Record<string, unknown> = {}) {
  return createSystem(
    defaultConfig,
    previewTheme,
    defineConfig({ theme: theme as SystemConfig['theme'] }),
  );
}

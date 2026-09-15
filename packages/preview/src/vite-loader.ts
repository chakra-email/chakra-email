import { sep } from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import type { ResolvedPreviewConfig } from './config.js';
import type { TemplateModule } from './render-template.js';

export interface TemplateWatchEvent {
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  path: string;
}

export interface TemplateModuleLoader {
  close(): Promise<void>;
  load(path: string): Promise<TemplateModule>;
}

function toViteFileUrl(path: string): string {
  return `/@fs/${path.split(sep).join('/')}`;
}

export async function createTemplateModuleLoader(
  config: ResolvedPreviewConfig,
  onWatchEvent: (event: TemplateWatchEvent) => void,
): Promise<TemplateModuleLoader> {
  const vite: ViteDevServer = await createServer({
    appType: 'custom',
    configFile: false,
    envDir: false,
    logLevel: 'error',
    resolve: {
      dedupe: ['react', 'react-dom'],
      tsconfigPaths: true,
    },
    root: config.root,
    // Linked workspace packages must share the renderer's native module instance.
    // Transforming core again creates separate security/theme/color-mode contexts.
    ssr: {
      external: ['react', 'react-dom', '@chakra-email/core'],
    },
    server: {
      fs: {
        allow: [config.root],
        strict: true,
      },
      hmr: false,
      middlewareMode: true,
      ws: false,
      watch: {
        ignored: ['**/.git/**', '**/dist/**', '**/node_modules/**'],
      },
    },
  });

  vite.watcher.add([...config.templateRoots]);
  vite.watcher.on('all', (event, path) => {
    if (
      event === 'add' ||
      event === 'addDir' ||
      event === 'change' ||
      event === 'unlink' ||
      event === 'unlinkDir'
    ) {
      onWatchEvent({ event, path });
    }
  });

  return {
    async close() {
      await vite.close();
    },
    async load(path) {
      try {
        return (await vite.ssrLoadModule(
          toViteFileUrl(path),
        )) as TemplateModule;
      } catch (error) {
        if (error instanceof Error) {
          vite.ssrFixStacktrace(error);
        }
        throw error;
      }
    },
  };
}

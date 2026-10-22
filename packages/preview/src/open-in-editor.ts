import { stat } from 'node:fs/promises';
import { isIP } from 'node:net';
import launchEditor from 'launch-editor';

export function isLoopbackHost(host: string): boolean {
  const hostname = host.toLowerCase().replace(/^\[|\]$/gu, '');
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    (isIP(hostname) === 4 && hostname.startsWith('127.'))
  );
}

/** launch-editor has an error callback but no successful-spawn callback. */
export async function openTemplateInEditor(path: string): Promise<void> {
  if (!(await stat(path)).isFile()) {
    throw new Error('The template source is no longer a file.');
  }
  await new Promise<void>((resolve, reject) => {
    // A GUI editor can remain open indefinitely. Acknowledge the launch after
    // allowing immediate discovery/spawn failures to arrive, not on editor exit.
    const acknowledgement = setTimeout(resolve, 500);
    try {
      launchEditor(path, undefined, (_file, message) => {
        clearTimeout(acknowledgement);
        reject(
          new Error(
            message ||
              'No supported editor could be found. Set LAUNCH_EDITOR or EDITOR.',
          ),
        );
      });
    } catch (error) {
      clearTimeout(acknowledgement);
      reject(error);
    }
  });
}

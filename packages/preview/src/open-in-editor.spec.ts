import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import launchEditor from 'launch-editor';
import { isLoopbackHost, openTemplateInEditor } from './open-in-editor.js';

vi.mock('launch-editor', () => ({ default: vi.fn() }));

describe('local editor launcher', () => {
  let directory: string;
  let file: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'chakra-email-editor-'));
    file = join(directory, 'welcome.tsx');
    await writeFile(file, 'export default Welcome;');
    vi.mocked(launchEditor).mockReset();
  });
  afterEach(async () => {
    vi.useRealTimers();
    await rm(directory, { recursive: true, force: true });
  });

  it.each(['127.0.0.1', '127.1.2.3', 'localhost', '::1', '[::1]'])(
    'allows loopback %s',
    (host) => {
      expect(isLoopbackHost(host)).toBe(true);
    },
  );
  it.each([
    '0.0.0.0',
    '::',
    '192.168.1.2',
    'localhost.attacker.example',
    '127.attacker.example',
  ])('refuses remote host %s', (host) => {
    expect(isLoopbackHost(host)).toBe(false);
  });
  it('acknowledges a launch without waiting for the editor to close', async () => {
    vi.useFakeTimers();
    const launched = openTemplateInEditor(file);
    await vi.waitFor(() => expect(launchEditor).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(500);
    await expect(launched).resolves.toBeUndefined();
    expect(vi.mocked(launchEditor).mock.calls[0]?.[0]).toBe(file);
  });
  it('reports missing editor and immediate launch errors', async () => {
    vi.mocked(launchEditor).mockImplementation((_file, _editor, onError) => {
      onError?.(file, null);
    });
    await expect(openTemplateInEditor(file)).rejects.toThrow(
      'No supported editor',
    );
    vi.mocked(launchEditor).mockImplementation(() => {
      throw new Error('Spawn failed.');
    });
    await expect(openTemplateInEditor(file)).rejects.toThrow('Spawn failed.');
  });
  it('reports asynchronous spawn errors before acknowledging the launch', async () => {
    vi.useFakeTimers();
    vi.mocked(launchEditor).mockImplementation((_file, _editor, onError) => {
      setTimeout(() => onError?.(file, 'Editor command was not found.'), 25);
    });
    const result = expect(openTemplateInEditor(file)).rejects.toThrow(
      'Editor command was not found.',
    );
    await vi.waitFor(() => expect(launchEditor).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(25);
    await result;
  });
  it('never launches missing source files or directories', async () => {
    await expect(
      openTemplateInEditor(join(directory, 'missing.tsx')),
    ).rejects.toThrow();
    await expect(openTemplateInEditor(directory)).rejects.toThrow(
      'no longer a file',
    );
    expect(launchEditor).not.toHaveBeenCalled();
  });
});

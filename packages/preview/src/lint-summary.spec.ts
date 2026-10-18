import type { RegisteredTemplate, TemplateRegistry } from './discovery.js';
import { createLintSummaryRunner } from './lint-summary.js';
import type {
  LintSummaryDependencies,
  LintSummaryRunner,
} from './lint-summary.js';
import type { PreviewLintFinding } from './protocol.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function at<T>(values: T[], index: number): T {
  const value = values[index];
  if (!value) throw new Error(`Missing test value ${index}`);
  return value;
}

function registry(count = 3): TemplateRegistry {
  const templates: RegisteredTemplate[] = Array.from(
    { length: count },
    (_, index) => ({
      id: `template-${index}`,
      name: `Template ${index}`,
      path: `emails/${index}.tsx`,
      absolutePath: `/project/emails/${index}.tsx`,
    }),
  );
  return {
    templates,
    byId: new Map(templates.map((template) => [template.id, template])),
  };
}

function finding(severity: PreviewLintFinding['severity']): PreviewLintFinding {
  return {
    severity,
    category: 'content',
    ruleId: 'placeholder-text',
    message: 'Placeholder',
    suggestion: 'Replace it.',
  };
}

describe('background lint summaries', () => {
  const runners: LintSummaryRunner[] = [];
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    for (const runner of runners.splice(0)) runner.close();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
  function setup(overrides: Partial<LintSummaryDependencies> = {}) {
    const dependencies = {
      getRegistry: vi.fn(() => registry()),
      load: vi.fn(async () => ({
        previewProps: { name: 'Default' },
        previewVariants: { other: { name: 'Variant' } },
      })),
      render: vi.fn(async () => ({
        lint: [finding('warning'), finding('warning'), finding('info')],
      })),
      publish: vi.fn(),
      ...overrides,
    };
    const runner = createLintSummaryRunner(dependencies);
    runners.push(runner);
    return { runner, ...dependencies };
  }

  it('debounces changes for 500 ms and publishes one complete default-props snapshot', async () => {
    const current = setup();
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(400);
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(499);
    expect(current.load).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(current.load).toHaveBeenCalledTimes(3);
    expect(current.render).toHaveBeenCalledTimes(3);
    expect(current.render).toHaveBeenCalledWith({
      module: expect.any(Object),
      template: expect.objectContaining({ id: 'template-0' }),
      signal: expect.any(AbortSignal),
    });
    expect(current.publish).toHaveBeenCalledExactlyOnceWith({
      generation: 1,
      templates: [0, 1, 2].map((index) => ({
        id: `template-${index}`,
        error: 0,
        warning: 2,
        info: 1,
      })),
    });
  });

  it('limits background work to two templates and preserves discovery order', async () => {
    const jobs = Array.from({ length: 3 }, () =>
      deferred<{ lint: PreviewLintFinding[] }>(),
    );
    let index = 0;
    const current = setup({ render: vi.fn(() => at(jobs, index++).promise) });
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(501);
    expect(current.render).toHaveBeenCalledTimes(2);
    at(jobs, 1).resolve({ lint: [finding('error')] });
    await vi.advanceTimersByTimeAsync(1);
    expect(current.render).toHaveBeenCalledTimes(3);
    expect(current.publish).not.toHaveBeenCalled();
    at(jobs, 2).resolve({ lint: [] });
    at(jobs, 0).resolve({ lint: [finding('info')] });
    await vi.runAllTimersAsync();
    expect(current.publish).toHaveBeenCalledExactlyOnceWith({
      generation: 1,
      templates: [
        { id: 'template-0', error: 0, warning: 0, info: 1 },
        { id: 'template-1', error: 1, warning: 0, info: 0 },
        { id: 'template-2', error: 0, warning: 0, info: 0 },
      ],
    });
  });

  it('aborts stale generations immediately and bounds slots across non-abortable runs', async () => {
    const jobs = [
      deferred<{ lint: PreviewLintFinding[] }>(),
      deferred<{ lint: PreviewLintFinding[] }>(),
    ];
    let index = 0;
    const render = vi.fn<LintSummaryDependencies['render']>(async () =>
      index < jobs.length ? at(jobs, index++).promise : { lint: [] },
    );
    const current = setup({ render });
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(501);
    const signals = render.mock.calls.map(([options]) => options.signal);
    current.runner.schedule();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await vi.advanceTimersByTimeAsync(501);
    expect(render).toHaveBeenCalledTimes(2);
    at(jobs, 0).resolve({ lint: [finding('error')] });
    at(jobs, 1).resolve({ lint: [] });
    await vi.runAllTimersAsync();
    expect(current.publish).toHaveBeenCalledExactlyOnceWith({
      generation: 2,
      templates: [0, 1, 2].map((id) => ({
        id: `template-${id}`,
        error: 0,
        warning: 0,
        info: 0,
      })),
    });
  });

  it('does not render a module that finishes loading after its generation was cancelled', async () => {
    const loading = deferred<Record<string, unknown>>();
    const current = setup({ load: vi.fn(() => loading.promise) });
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(501);
    current.runner.schedule();
    loading.resolve({});
    await vi.advanceTimersByTimeAsync(1);
    expect(current.render).not.toHaveBeenCalled();
    expect(current.publish).not.toHaveBeenCalled();
    current.runner.close();
  });

  it('counts load and render failures as one error each and continues the run', async () => {
    const load = vi.fn(async (path: string) => {
      if (path.endsWith('/0.tsx')) throw new Error('Bad import');
      return {};
    });
    const current = setup({
      load,
      render: vi.fn(async ({ template }) => {
        if (template.id === 'template-1') throw new Error('Bad render');
        return { lint: [finding('info')] };
      }),
    });
    current.runner.schedule();
    await vi.runAllTimersAsync();
    expect(current.publish).toHaveBeenCalledExactlyOnceWith({
      generation: 1,
      templates: [
        { id: 'template-0', error: 1, warning: 0, info: 0 },
        { id: 'template-1', error: 1, warning: 0, info: 0 },
        { id: 'template-2', error: 0, warning: 0, info: 1 },
      ],
    });
  });

  it('lets explicit requests start immediately and pauses background dispatch until all settle', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const current = setup();
    const task = vi.fn(() => first.promise);
    const request = current.runner.runExplicit(task);
    const other = current.runner.runExplicit(() => second.promise);
    expect(task).toHaveBeenCalledOnce();
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(501);
    expect(current.load).not.toHaveBeenCalled();
    first.resolve('Ready');
    await expect(request).resolves.toBe('Ready');
    await vi.advanceTimersByTimeAsync(1);
    expect(current.load).not.toHaveBeenCalled();
    second.reject(new Error('Explicit failure'));
    await expect(other).rejects.toThrow('Explicit failure');
    await vi.runAllTimersAsync();
    expect(current.publish).toHaveBeenCalledOnce();
  });

  it('pauses between module loading and rendering when an explicit request arrives', async () => {
    const loading = deferred<Record<string, unknown>>();
    const foreground = deferred<void>();
    const current = setup({ load: vi.fn(() => loading.promise) });
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(501);
    const request = current.runner.runExplicit(() => foreground.promise);
    loading.resolve({});
    await vi.advanceTimersByTimeAsync(1);
    expect(current.render).not.toHaveBeenCalled();
    foreground.resolve();
    await request;
    await vi.runAllTimersAsync();
    expect(current.render).toHaveBeenCalledTimes(3);
  });

  it('snapshots the current registry after debounce and publishes empty discovery', async () => {
    let discovered = registry(3);
    const current = setup({ getRegistry: () => discovered });
    current.runner.schedule();
    discovered = registry(1);
    await vi.runAllTimersAsync();
    expect(current.load).toHaveBeenCalledTimes(1);
    discovered = registry(0);
    current.runner.schedule();
    await vi.runAllTimersAsync();
    expect(current.publish).toHaveBeenLastCalledWith({
      generation: 2,
      templates: [],
    });
  });

  it('closes pending and in-flight runs without publishing or leaving timers', async () => {
    const loading = deferred<Record<string, unknown>>();
    const load = vi.fn<LintSummaryDependencies['load']>(() => loading.promise);
    const current = setup({ load });
    current.runner.schedule();
    await vi.advanceTimersByTimeAsync(501);
    const signal = load.mock.calls[0]?.[1];
    current.runner.close();
    expect(signal?.aborted).toBe(true);
    loading.resolve({});
    await vi.runAllTimersAsync();
    current.runner.schedule();
    expect(current.render).not.toHaveBeenCalled();
    expect(current.publish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    const pending = setup();
    pending.runner.schedule();
    pending.runner.close();
    await vi.runAllTimersAsync();
    expect(pending.load).not.toHaveBeenCalled();
  });
});

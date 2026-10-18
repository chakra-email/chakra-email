import type { RegisteredTemplate, TemplateRegistry } from './discovery.js';
import type {
  PreviewLintFinding,
  PreviewLintSummary,
  PreviewLintSummaryEntry,
} from './protocol.js';
import type { TemplateModule } from './render-template.js';

export interface LintSummaryDependencies {
  getRegistry(): TemplateRegistry;
  load(path: string, signal: AbortSignal): Promise<TemplateModule>;
  /** Render default props only: never pass a variant or edited props. */
  render(options: {
    module: TemplateModule;
    signal: AbortSignal;
    template: RegisteredTemplate;
  }): Promise<{ lint: PreviewLintFinding[] }>;
  publish(summary: PreviewLintSummary): void;
}

export interface LintSummaryRunner {
  /** Invalidate stale results immediately; start after 500 ms of quiet. */
  schedule(): void;
  /** Explicit requests run immediately and pause further background dispatch. */
  runExplicit<T>(task: () => Promise<T>): Promise<T>;
  close(): void;
}

interface SummaryRun {
  abort: AbortController;
  generation: number;
  templates: RegisteredTemplate[];
  results: PreviewLintSummaryEntry[];
  next: number;
  completed: number;
}

/**
 * Keeps only one pending generation, with at most two background tasks in flight
 * across all generations. Cancellation also works with non-abortable renderers:
 * their stale results are discarded and their slots stay occupied until settled.
 */
export function createLintSummaryRunner(
  dependencies: LintSummaryDependencies,
): LintSummaryRunner {
  let closed = false;
  let generation = 0;
  let active = 0;
  let explicit = 0;
  const foregroundWaiters = new Set<() => void>();
  let run: SummaryRun | undefined;
  let debounce: NodeJS.Timeout | undefined;
  let dispatch: NodeJS.Timeout | undefined;

  const isCurrent = (candidate: SummaryRun): boolean =>
    !closed && run === candidate && !candidate.abort.signal.aborted;

  const waitForForeground = async (signal: AbortSignal): Promise<void> => {
    while (explicit > 0 && !signal.aborted) {
      await new Promise<void>((resolve) => {
        const resume = (): void => {
          foregroundWaiters.delete(resume);
          signal.removeEventListener('abort', resume);
          resolve();
        };
        foregroundWaiters.add(resume);
        signal.addEventListener('abort', resume, { once: true });
      });
    }
  };

  const queueDispatch = (): void => {
    if (closed || dispatch || !run || explicit > 0) return;
    // Yield between tasks so a ready HTTP request takes precedence over the next
    // background template, even when load/render resolve synchronously.
    dispatch = setTimeout(() => {
      dispatch = undefined;
      pump();
    }, 0);
    dispatch.unref();
  };

  const summarize = async (
    candidate: SummaryRun,
    template: RegisteredTemplate,
    index: number,
  ): Promise<void> => {
    const counts: PreviewLintSummaryEntry = {
      id: template.id,
      error: 0,
      warning: 0,
      info: 0,
    };
    try {
      const signal = candidate.abort.signal;
      const module = await dependencies.load(template.absolutePath, signal);
      await waitForForeground(signal);
      if (!isCurrent(candidate)) return;
      const rendered = await dependencies.render({ module, signal, template });
      if (!isCurrent(candidate)) return;
      for (const finding of rendered.lint) counts[finding.severity] += 1;
    } catch {
      if (!isCurrent(candidate)) return;
      counts.error = 1;
    } finally {
      active -= 1;
      if (isCurrent(candidate)) {
        candidate.results[index] = counts;
        candidate.completed += 1;
        if (candidate.completed === candidate.templates.length) {
          run = undefined;
          dependencies.publish({
            generation: candidate.generation,
            templates: candidate.results,
          });
        }
      }
      queueDispatch();
    }
  };

  function pump(): void {
    const candidate = run;
    if (!candidate || !isCurrent(candidate) || explicit > 0) return;
    while (active < 2 && candidate.next < candidate.templates.length) {
      const index = candidate.next++;
      const template = candidate.templates[index];
      if (!template) continue;
      active += 1;
      void summarize(candidate, template, index);
    }
  }

  return {
    schedule(): void {
      if (closed) return;
      run?.abort.abort();
      run = undefined;
      if (debounce) clearTimeout(debounce);
      if (dispatch) clearTimeout(dispatch);
      dispatch = undefined;
      debounce = setTimeout(() => {
        debounce = undefined;
        if (closed) return;
        const registry = dependencies.getRegistry();
        // Snapshot discovery once: additions/removals belong to the next run.
        const templates = registry.templates.map((template) => {
          const registered = registry.byId.get(template.id);
          if (!registered) {
            throw new Error(`Template registry is missing ${template.id}.`);
          }
          return registered;
        });
        const nextGeneration = ++generation;
        if (templates.length === 0) {
          dependencies.publish({ generation: nextGeneration, templates: [] });
          return;
        }
        run = {
          abort: new AbortController(),
          generation: nextGeneration,
          templates,
          results: [],
          next: 0,
          completed: 0,
        };
        queueDispatch();
      }, 500);
      debounce.unref();
    },
    async runExplicit<T>(task: () => Promise<T>): Promise<T> {
      explicit += 1;
      try {
        return await task();
      } finally {
        explicit -= 1;
        if (explicit === 0) {
          for (const resume of foregroundWaiters) resume();
        }
        queueDispatch();
      }
    },
    close(): void {
      if (closed) return;
      closed = true;
      run?.abort.abort();
      run = undefined;
      if (debounce) clearTimeout(debounce);
      if (dispatch) clearTimeout(dispatch);
      debounce = undefined;
      dispatch = undefined;
    },
  };
}

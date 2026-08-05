import './styles.css';

import { docPages, examples, packageLinks, quickStartSteps } from './content';
import type { Example } from './content';
import { escapeHtml, renderMarkdown } from './markdown';
import { exampleTabId, nextExampleTabIndex, renderExampleTabs } from './tabs';

let selectedExampleId = examples[0]?.id ?? '';

function getSelectedExample(): Example {
  const selected = examples.find((example) => example.id === selectedExampleId);
  const first = examples[0];

  if (selected) {
    return selected;
  }

  if (!first) {
    throw new Error('At least one site example is required.');
  }

  return first;
}

function renderNavLinks() {
  return docPages
    .map(
      (page) => `
        <a href="#${page.id}" class="doc-nav-link">
          <span>${escapeHtml(page.title)}</span>
          <small>${escapeHtml(page.eyebrow)}</small>
        </a>
      `,
    )
    .join('');
}

function renderDocs() {
  return docPages
    .map(
      (page) => `
        <article class="doc-panel" id="${page.id}">
          <div class="doc-panel-header">
            <p>${escapeHtml(page.eyebrow)}</p>
            <h2>${escapeHtml(page.title)}</h2>
            <span>${escapeHtml(page.description)}</span>
          </div>
          <div class="markdown-body">
            ${renderMarkdown(page.source, {
              headingIdPrefix: page.id,
              headingLevelOffset: 1,
              omitLeadingTitle: true,
            })}
          </div>
          <a class="source-link" href="${page.sourceHref}">
            Edit this page on GitHub
          </a>
        </article>
      `,
    )
    .join('');
}

function renderQuickStartSteps() {
  return quickStartSteps
    .map(
      (step, index) => `
        <li>
          <span>${index + 1}</span>
          <div>
            <strong>${escapeHtml(step.title)}</strong>
            <code>${escapeHtml(step.command)}</code>
          </div>
        </li>
      `,
    )
    .join('');
}

function renderExampleCards() {
  return examples
    .map(
      (example) => `
        <a class="example-card" href="${example.href}">
          <strong>${escapeHtml(example.title)}</strong>
          <span>${escapeHtml(example.description)}</span>
        </a>
      `,
    )
    .join('');
}

function renderPackageLinks() {
  return packageLinks
    .map(
      (item) => `
        <a class="package-row" href="${item.href}">
          <span>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.description)}</small>
          </span>
          <code>${escapeHtml(item.install)}</code>
        </a>
      `,
    )
    .join('');
}

function renderApp() {
  const selectedExample = getSelectedExample();
  const root = document.querySelector<HTMLElement>('#app');

  if (!root) {
    throw new Error('Missing #app root element.');
  }

  root.innerHTML = `
    <header class="site-header">
      <a href="#top" class="brand-mark" aria-label="Chakra Email home">
        <span aria-hidden="true">ce</span>
        <strong>Chakra Email</strong>
      </a>
      <nav aria-label="Primary">
        <a href="#docs">Docs</a>
        <a href="#examples">Examples</a>
        <a href="#packages">Packages</a>
        <a href="https://github.com/chakra-email/chakra-email">GitHub</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero-section" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">React email primitives with Chakra-style props</p>
          <h1 id="hero-title">Chakra Email</h1>
          <p class="hero-lede">
            Build transactional emails with theme tokens, email-safe components,
            markdown body primitives, and server-side rendering from one package.
          </p>
          <div class="hero-actions">
            <a class="primary-action" href="#getting-started">Start Building</a>
            <a class="secondary-action" href="https://www.npmjs.com/package/chakra-email">
              View npm Package
            </a>
          </div>
        </div>

        <div class="email-preview" aria-label="Rendered email preview">
          <div class="email-toolbar">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="email-paper">
            <p class="email-kicker">Preview text</p>
            <h2>Your Acme account is ready.</h2>
            <p>
              Compose the message with Chakra-style props, render it to static
              HTML, and send it with your provider of choice.
            </p>
            <a href="#examples">Get Started</a>
          </div>
          <pre><code>${escapeHtml(
            `<Button bg="brand.500" color="white">\n  Get Started\n</Button>`,
          )}</code></pre>
        </div>
      </section>

      <section class="quickstart-band" aria-labelledby="quickstart-title">
        <div>
          <p class="eyebrow">Quickstart</p>
          <h2 id="quickstart-title">Install, compose, render.</h2>
        </div>
        <ol>${renderQuickStartSteps()}</ol>
      </section>

      <section class="docs-section" id="docs" aria-labelledby="docs-title">
        <aside class="docs-sidebar" aria-label="Documentation pages">
          <p class="eyebrow">Documentation</p>
          <h2 id="docs-title">Single-source docs</h2>
          <p>
            These pages are rendered from the markdown files in <code>docs/</code>,
            so the repository and site stay in sync.
          </p>
          <nav>${renderNavLinks()}</nav>
        </aside>
        <div class="docs-stack">${renderDocs()}</div>
      </section>

      <section class="examples-section" id="examples" aria-labelledby="examples-title">
        <div class="section-heading">
          <p class="eyebrow">Examples</p>
          <h2 id="examples-title">Reference templates and markdown bodies.</h2>
          <p>
            Link out to runnable repository examples while previewing the source
            directly in the docs site.
          </p>
        </div>
        <div class="example-grid">${renderExampleCards()}</div>
        <div class="code-workbench">
          <div class="example-tabs" role="tablist" aria-label="Example source">
            ${renderExampleTabs(examples, selectedExampleId)}
          </div>
          <pre
            id="example-panel"
            role="tabpanel"
            tabindex="0"
            aria-labelledby="${exampleTabId(selectedExample.id)}"
          ><code id="example-code">${escapeHtml(selectedExample.source)}</code></pre>
        </div>
      </section>

      <section class="packages-section" id="packages" aria-labelledby="packages-title">
        <div class="section-heading">
          <p class="eyebrow">Packages</p>
          <h2 id="packages-title">Pick the entrypoint that matches your app.</h2>
        </div>
        <div class="package-list">${renderPackageLinks()}</div>
      </section>
    </main>

    <footer class="site-footer">
      <span>MIT licensed.</span>
      <span>
        Created by <a href="https://www.ryanhefner.com">Ryan Hefner</a> and
        <a href="https://commune.software">Commune Software</a>.
      </span>
      <a href="https://github.com/chakra-email/chakra-email/blob/main/CHANGELOG.md">
        Changelog
      </a>
      <a href="https://github.com/chakra-email/chakra-email/security/policy">
        Security
      </a>
    </footer>
  `;

  bindExampleTabs(root);
}

function bindExampleTabs(root: HTMLElement) {
  const codeBlock = root.querySelector<HTMLElement>('#example-code');
  const panel = root.querySelector<HTMLElement>('#example-panel');
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[role="tab"][data-example-id]'),
  );

  const selectExample = (exampleId: string | undefined, focus: boolean) => {
    const nextExample = examples.find((example) => example.id === exampleId);

    if (!nextExample || !codeBlock || !panel) {
      return;
    }

    selectedExampleId = nextExample.id;
    codeBlock.textContent = nextExample.source;
    panel.setAttribute('aria-labelledby', exampleTabId(nextExample.id));

    for (const tab of tabs) {
      const selected = tab.dataset.exampleId === selectedExampleId;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', selected.toString());
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) {
        tab.focus();
      }
    }
  };

  tabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      selectExample(button.dataset.exampleId, false);
    });

    button.addEventListener('keydown', (event) => {
      const nextIndex = nextExampleTabIndex(event.key, index, tabs.length);

      if (nextIndex !== undefined) {
        event.preventDefault();
        selectExample(tabs[nextIndex]?.dataset.exampleId, true);
      }
    });
  });
}

renderApp();

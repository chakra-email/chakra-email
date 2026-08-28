import {
  DocsArticle,
  DocsLayout,
  DocsPagination,
  DocsProvider,
  DocsSearch,
  type DocsLinkProps,
} from '@chakra-docs/chakra';
import { chakraDocsThemeConfig } from '@chakra-docs/chakra/theme';
import type { DocsPage } from '@chakra-docs/core';
import { createSystem, defaultConfig } from '@chakra-ui/react';
import {
  PostkitProvider,
  Prose,
  createPostkitMdxComponents,
} from '@postkit/react';
import { createPostkitRemarkPlugins } from '@postkit/react/remark';
import { createPostkitShikiAdapter } from '@postkit/shiki';
import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

import { examples, packageLinks, quickStartSteps } from './content';
import { docsManifest, getDocsPage, resolveMarkdownHref } from './docs';
import { exampleTabId, nextExampleTabIndex } from './tabs';

const docsSystem = createSystem(defaultConfig, chakraDocsThemeConfig);
const shikiAdapter = createPostkitShikiAdapter();
const remarkPlugins = createPostkitRemarkPlugins({
  postkit: { output: 'hast' },
});

function shouldHandleNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

function scrollToLocation(href: string) {
  const hash = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';

  requestAnimationFrame(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash))?.scrollIntoView?.();
      return;
    }

    document.getElementById('docs')?.scrollIntoView?.();
  });
}

function useDocsNavigation() {
  const [page, setPage] = useState(() => getDocsPage(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setPage(getDocsPage(window.location.pathname));
      scrollToLocation(`${window.location.pathname}${window.location.hash}`);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((href: string) => {
    const url = new URL(href, window.location.href);

    if (
      url.origin !== window.location.origin ||
      !url.pathname.startsWith('/docs/')
    ) {
      window.location.assign(url);
      return;
    }

    window.history.pushState({}, '', `${url.pathname}${url.hash}`);
    setPage(getDocsPage(url.pathname));
    scrollToLocation(`${url.pathname}${url.hash}`);
  }, []);

  return { navigate, page };
}

function InternalLink({
  href,
  onClick,
  onNavigate,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (shouldHandleNavigation(event)) {
          event.preventDefault();
          onNavigate(href);
        }
      }}
    />
  );
}

function DocsMarkdown({
  page,
  onNavigate,
}: {
  page: DocsPage;
  onNavigate: (href: string) => void;
}) {
  let headingIndex = 0;
  const headings = page.headings ?? [];
  const components = createPostkitMdxComponents({
    link: ({ href, ...props }) => {
      const resolvedHref = resolveMarkdownHref(href);

      if (resolvedHref?.startsWith('/docs/')) {
        return (
          <InternalLink
            {...props}
            href={resolvedHref}
            onNavigate={onNavigate}
          />
        );
      }

      return <a {...props} href={resolvedHref} />;
    },
  }) as Components;

  for (const [sourceLevel, renderedLevel] of [
    ['h2', 'h3'],
    ['h3', 'h4'],
    ['h4', 'h5'],
    ['h5', 'h6'],
    ['h6', 'h6'],
  ] as const) {
    const Heading = components[renderedLevel];
    const RenderedHeading = renderedLevel;
    components[sourceLevel] = (props) => {
      const heading = headings[headingIndex++];

      return createElement((Heading ?? RenderedHeading) as ElementType, {
        ...props,
        id: heading?.id,
      });
    };
  }

  return (
    <Prose>
      <ReactMarkdown
        components={components}
        remarkPlugins={remarkPlugins}
        skipHtml
      >
        {page.body ?? ''}
      </ReactMarkdown>
    </Prose>
  );
}

function ExampleWorkbench() {
  const [selectedExampleId, setSelectedExampleId] = useState(
    examples[0]?.id ?? '',
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedExample =
    examples.find((example) => example.id === selectedExampleId) ?? examples[0];

  if (!selectedExample) {
    return null;
  }

  const selectFromKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const nextIndex = nextExampleTabIndex(event.key, index, examples.length);

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const nextExample = examples[nextIndex];
    if (nextExample) {
      setSelectedExampleId(nextExample.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="code-workbench">
      <div className="example-tabs" role="tablist" aria-label="Example source">
        {examples.map((example, index) => {
          const selected = example.id === selectedExample.id;
          return (
            <button
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={exampleTabId(example.id)}
              className={`example-tab${selected ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="example-panel"
              tabIndex={selected ? 0 : -1}
              key={example.id}
              onClick={() => setSelectedExampleId(example.id)}
              onKeyDown={(event) => selectFromKeyboard(event, index)}
            >
              {example.title}
            </button>
          );
        })}
      </div>
      <pre
        id="example-panel"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={exampleTabId(selectedExample.id)}
      >
        <code id="example-code">{selectedExample.source}</code>
      </pre>
    </div>
  );
}

export function App() {
  const { navigate, page } = useDocsNavigation();
  const DocsLink = useMemo(
    () =>
      function ChakraEmailDocsLink(props: DocsLinkProps) {
        return (
          <InternalLink
            {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
            href={props.href}
            onNavigate={navigate}
          />
        );
      },
    [navigate],
  );

  return (
    <PostkitProvider system={docsSystem} codeBlockAdapter={shikiAdapter}>
      <DocsProvider
        config={{
          linkComponent: DocsLink,
          layout: { stickyTop: 24, scrollMarginTop: 24 },
        }}
      >
        <header className="site-header">
          <a href="#top" className="brand-mark" aria-label="Chakra Email home">
            <span aria-hidden="true">ce</span>
            <strong>Chakra Email</strong>
          </a>
          <nav aria-label="Primary">
            <DocsLink href="/docs/getting-started">Docs</DocsLink>
            <a href="#examples">Examples</a>
            <a href="#packages">Packages</a>
            <a href="https://github.com/chakra-email/chakra-email">GitHub</a>
          </nav>
        </header>

        <main id="top">
          <section className="hero-section" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="eyebrow">
                React email primitives with Chakra-style props
              </p>
              <h1 id="hero-title">Chakra Email</h1>
              <p className="hero-lede">
                Build transactional emails with theme tokens, email-safe
                components, markdown body primitives, and server-side rendering
                from one package.
              </p>
              <div className="hero-actions">
                <DocsLink
                  className="primary-action"
                  href="/docs/getting-started"
                >
                  Start Building
                </DocsLink>
                <a
                  className="secondary-action"
                  href="https://www.npmjs.com/package/chakra-email"
                >
                  View npm Package
                </a>
              </div>
            </div>

            <div className="email-preview" aria-label="Rendered email preview">
              <div className="email-toolbar">
                <span />
                <span />
                <span />
              </div>
              <div className="email-paper">
                <p className="email-kicker">Preview text</p>
                <h2>Your Acme account is ready.</h2>
                <p>
                  Compose the message with Chakra-style props, render it to
                  static HTML, and send it with your provider of choice.
                </p>
                <a href="#examples">Get Started</a>
              </div>
              <pre>
                <code>
                  {
                    '<Button bg="brand.500" color="white">\n  Get Started\n</Button>'
                  }
                </code>
              </pre>
            </div>
          </section>

          <section
            className="quickstart-band"
            aria-labelledby="quickstart-title"
          >
            <div>
              <p className="eyebrow">Quickstart</p>
              <h2 id="quickstart-title">Install, compose, render.</h2>
            </div>
            <ol>
              {quickStartSteps.map((step, index) => (
                <li key={step.title}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <code>{step.command}</code>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="docs-experience"
            id="docs"
            aria-labelledby="docs-title"
          >
            <div className="docs-intro">
              <div>
                <p className="eyebrow">Documentation</p>
                <h2 id="docs-title">Single-source docs</h2>
                <p>
                  Chakra Docs provides navigation and page structure; Postkit
                  renders the repository Markdown with reusable prose and code
                  recipes.
                </p>
              </div>
              <DocsSearch
                records={docsManifest.search}
                onNavigate={(href) => navigate(href)}
              />
            </div>
            <DocsLayout
              nav={docsManifest.nav}
              page={page}
              headings={page.headings}
              sidebarSlotProps={{ 'aria-label': 'Documentation pages' }}
            >
              <DocsArticle page={page} titleSlotProps={{ as: 'h2' }}>
                <DocsMarkdown page={page} onNavigate={navigate} />
                <a
                  className="source-link"
                  href={String(page.frontmatter['sourceHref'])}
                >
                  Edit this page on GitHub
                </a>
                <DocsPagination
                  nav={docsManifest.nav}
                  page={page}
                  slotProps={{ 'aria-label': 'Documentation pagination' }}
                />
              </DocsArticle>
            </DocsLayout>
          </section>

          <section
            className="examples-section"
            id="examples"
            aria-labelledby="examples-title"
          >
            <div className="section-heading">
              <p className="eyebrow">Examples</p>
              <h2 id="examples-title">
                Reference templates and markdown bodies.
              </h2>
              <p>
                Link out to runnable repository examples while previewing the
                source directly in the docs site.
              </p>
            </div>
            <div className="example-grid">
              {examples.map((example) => (
                <a
                  className="example-card"
                  href={example.href}
                  key={example.id}
                >
                  <strong>{example.title}</strong>
                  <span>{example.description}</span>
                </a>
              ))}
            </div>
            <ExampleWorkbench />
          </section>

          <section
            className="packages-section"
            id="packages"
            aria-labelledby="packages-title"
          >
            <div className="section-heading">
              <p className="eyebrow">Packages</p>
              <h2 id="packages-title">
                Pick the entrypoint that matches your app.
              </h2>
            </div>
            <div className="package-list">
              {packageLinks.map((item) => (
                <a className="package-row" href={item.href} key={item.name}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <code>{item.install}</code>
                </a>
              ))}
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <span>MIT licensed.</span>
          <span>
            Created by <a href="https://www.ryanhefner.com">Ryan Hefner</a> and{' '}
            <a href="https://commune.software">Commune Software</a>.
          </span>
          <a href="https://github.com/chakra-email/chakra-email/blob/main/CHANGELOG.md">
            Changelog
          </a>
          <a href="https://github.com/chakra-email/chakra-email/security/policy">
            Security
          </a>
        </footer>
      </DocsProvider>
    </PostkitProvider>
  );
}

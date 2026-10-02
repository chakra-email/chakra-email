import type { DocsPage } from '@chakra-docs/core';
import { Prose, createPostkitMdxComponents } from '@postkit/react';
import { createPostkitRemarkPlugins } from '@postkit/react/remark';
import { createElement, type ElementType } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { resolveMarkdownHref } from '../docs';
import { SiteLink } from './site-link';

const remarkPlugins = createPostkitRemarkPlugins({
  postkit: { output: 'hast' },
});

export function DocsMarkdown({ page }: { page: DocsPage }) {
  let headingIndex = 0;
  const components = createPostkitMdxComponents({
    link: ({ href, ...props }) => (
      <SiteLink {...props} href={resolveMarkdownHref(href) ?? ''} />
    ),
  }) as Components;
  for (const level of ['h2', 'h3', 'h4', 'h5', 'h6'] as const) {
    const Heading = components[level];
    components[level] = (props) =>
      createElement((Heading ?? level) as ElementType, {
        ...props,
        id: page.headings?.[headingIndex++]?.id,
      });
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

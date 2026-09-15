import type { CSSProperties } from 'react';
import { defineSlotRecipe } from './recipes.js';

export const chakraEmailSlotRecipeKeys = {
  button: 'chakraEmailButton',
  codeBlock: 'chakraEmailCodeBlock',
  container: 'chakraEmailContainer',
  list: 'chakraEmailList',
  markdown: 'chakraEmailMarkdown',
  preview: 'chakraEmailPreview',
  section: 'chakraEmailSection',
  stack: 'chakraEmailStack',
  table: 'chakraEmailTable',
} as const;

export const chakraEmailButtonSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-button',
  slots: ['root', 'cell', 'link'],
  base: {
    root: { style: { borderCollapse: 'separate' } },
    cell: { rounded: 'md' },
    link: {
      fontFamily: 'body',
      fontWeight: 'semibold',
      lineHeight: 'none',
      textAlign: 'center',
      textDecoration: 'none',
      display: 'inline-block',
    },
  },
  variants: {
    size: {
      sm: { link: { px: 4, py: 2, fontSize: 'sm' } },
      md: { link: { px: 6, py: 3, fontSize: 'md' } },
      lg: { link: { px: 8, py: 4, fontSize: 'lg' } },
    },
    variant: {
      solid: {
        cell: { bg: 'accent' },
        link: { color: 'accent.contrast' },
      },
      outline: {
        cell: { bg: 'transparent', borderColor: 'accent' },
        link: { color: 'accent' },
      },
      ghost: {
        cell: { bg: 'transparent' },
        link: { color: 'accent' },
      },
      link: {
        cell: { bg: 'transparent', border: 'none' },
        link: {
          p: 0,
          px: 0,
          py: 0,
          color: 'accent',
          textDecoration: 'underline',
        },
      },
    },
  },
  defaultVariants: { size: 'md', variant: 'solid' },
});

export const chakraEmailContainerSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-container',
  slots: ['root', 'cell'],
  base: {
    root: { w: 'full', maxW: '600px' },
  },
});

export const chakraEmailCodeBlockSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-code-block',
  slots: ['root', 'code', 'line', 'lineNumber', 'token'],
  base: {
    root: {
      m: '0 0 16px',
      p: 4,
      bg: 'bg.subtle',
      color: 'fg',
      rounded: 'md',
      fontFamily: 'mono',
      lineHeight: 'base',
      style: { overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' },
    },
    code: { fontFamily: 'mono' },
    line: {},
    lineNumber: {
      display: 'inline-block',
      color: 'fg.muted',
      mr: 4,
      textAlign: 'right',
    },
    token: { fontFamily: 'mono' },
  },
  variants: {
    size: {
      sm: { root: { fontSize: 'xs', p: 3 } },
      md: { root: { fontSize: 'sm', p: 4 } },
      lg: { root: { fontSize: 'md', p: 5 } },
    },
    variant: {
      subtle: { root: { bg: 'bg.subtle' } },
      outline: {
        root: { bg: 'bg', border: 'base', borderColor: 'border' },
      },
      plain: { root: { bg: 'transparent', p: 0, rounded: 'none' } },
    },
  },
  defaultVariants: { size: 'md', variant: 'subtle' },
});

export const chakraEmailMarkdownSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-markdown',
  slots: [
    'root',
    'heading',
    'paragraph',
    'link',
    'blockquote',
    'list',
    'listItem',
    'code',
    'pre',
    'hr',
    'table',
    'tableHeader',
    'tableCell',
    'image',
  ],
  base: {
    root: { color: 'fg', fontFamily: 'body' },
    link: { color: 'accent' },
    table: { w: 'full' },
    image: { maxW: 'full' },
  },
  variants: {
    size: {
      sm: {
        root: { fontSize: 'sm' },
        paragraph: { fontSize: 'sm' },
        list: { fontSize: 'sm' },
      },
      md: {},
      lg: {
        root: { fontSize: 'lg' },
        paragraph: { fontSize: 'lg' },
        list: { fontSize: 'lg' },
      },
    },
  },
  defaultVariants: { size: 'md' },
});

export const chakraEmailListSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-list',
  slots: ['root', 'item'],
  base: {
    root: { m: '0 0 16px', pl: 6 },
    item: { mb: 2 },
  },
});

type OutlookPreviewStyles = CSSProperties & { msoHide: 'all' };

const previewRootStyles: OutlookPreviewStyles = {
  display: 'none',
  fontSize: '1px',
  color: '#ffffff',
  lineHeight: '1px',
  maxHeight: '0px',
  maxWidth: '0px',
  overflow: 'hidden',
  visibility: 'hidden',
  opacity: 0,
  msoHide: 'all',
};

const previewSpacerStyles: OutlookPreviewStyles = {
  display: 'none',
  msoHide: 'all',
};

export const chakraEmailPreviewSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-preview',
  slots: ['root', 'spacer'],
  base: {
    root: { style: previewRootStyles },
    spacer: { style: previewSpacerStyles },
  },
});

export const chakraEmailSectionSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-section',
  slots: ['root', 'cell'],
  base: {
    root: { w: 'full' },
  },
});

export const chakraEmailStackSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-stack',
  slots: ['root', 'item'],
  base: {
    root: { w: 'full' },
  },
});

export const chakraEmailTableSlotRecipe = defineSlotRecipe({
  className: 'chakra-email-table',
  slots: [
    'root',
    'header',
    'body',
    'footer',
    'row',
    'columnHeader',
    'cell',
    'caption',
  ],
  base: {
    root: {
      m: '0 0 16px',
      w: 'full',
      style: { borderCollapse: 'collapse', borderSpacing: 0 },
    },
    columnHeader: {
      p: 3,
      bg: 'bg.subtle',
      color: 'fg',
      borderColor: 'border',
      fontWeight: 'semibold',
      textAlign: 'left',
      verticalAlign: 'top',
    },
    cell: {
      p: 3,
      borderColor: 'border',
      verticalAlign: 'top',
    },
    caption: {
      color: 'fg.muted',
      fontSize: 'sm',
      textAlign: 'left',
      mb: 2,
    },
  },
});

export const chakraEmailSlotRecipes = {
  [chakraEmailSlotRecipeKeys.button]: chakraEmailButtonSlotRecipe,
  [chakraEmailSlotRecipeKeys.codeBlock]: chakraEmailCodeBlockSlotRecipe,
  [chakraEmailSlotRecipeKeys.container]: chakraEmailContainerSlotRecipe,
  [chakraEmailSlotRecipeKeys.list]: chakraEmailListSlotRecipe,
  [chakraEmailSlotRecipeKeys.markdown]: chakraEmailMarkdownSlotRecipe,
  [chakraEmailSlotRecipeKeys.preview]: chakraEmailPreviewSlotRecipe,
  [chakraEmailSlotRecipeKeys.section]: chakraEmailSectionSlotRecipe,
  [chakraEmailSlotRecipeKeys.stack]: chakraEmailStackSlotRecipe,
  [chakraEmailSlotRecipeKeys.table]: chakraEmailTableSlotRecipe,
};

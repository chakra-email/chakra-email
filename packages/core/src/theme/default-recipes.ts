import { defineRecipe } from './recipes.js';

export const chakraEmailRecipeKeys = {
  badge: 'chakraEmailBadge',
  blockquote: 'chakraEmailBlockquote',
  body: 'chakraEmailBody',
  box: 'chakraEmailBox',
  code: 'chakraEmailCode',
  column: 'chakraEmailColumn',
  heading: 'chakraEmailHeading',
  hr: 'chakraEmailHr',
  html: 'chakraEmailHtml',
  img: 'chakraEmailImg',
  link: 'chakraEmailLink',
  pre: 'chakraEmailPre',
  row: 'chakraEmailRow',
  spacer: 'chakraEmailSpacer',
  text: 'chakraEmailText',
} as const;

export const chakraEmailBadgeRecipe = defineRecipe({
  className: 'chakra-email-badge',
  base: {
    bg: 'accent.subtle',
    color: 'accent.fg',
    px: 2,
    py: 1,
    rounded: 'sm',
    fontSize: 'xs',
    fontWeight: 'semibold',
    lineHeight: 'none',
    textTransform: 'uppercase',
  },
});

export const chakraEmailBlockquoteRecipe = defineRecipe({
  className: 'chakra-email-blockquote',
  base: {
    m: '0 0 16px',
    pl: 4,
    color: 'fg.muted',
    borderColor: 'border',
  },
});

export const chakraEmailBodyRecipe = defineRecipe({
  className: 'chakra-email-body',
  base: {
    m: 0,
    p: 0,
    bg: 'bg',
    color: 'fg',
    fontFamily: 'body',
    w: 'full',
  },
});

export const chakraEmailBoxRecipe = defineRecipe({
  className: 'chakra-email-box',
});

export const chakraEmailCodeRecipe = defineRecipe({
  className: 'chakra-email-code',
  base: {
    bg: 'bg.muted',
    color: 'fg',
    px: 1,
    py: 0,
    rounded: 'sm',
    fontFamily: 'mono',
    fontSize: 'sm',
    style: {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    },
  },
});

export const chakraEmailColumnRecipe = defineRecipe({
  className: 'chakra-email-column',
  base: { verticalAlign: 'top' },
});

export const chakraEmailHeadingRecipe = defineRecipe({
  className: 'chakra-email-heading',
  base: {
    m: '0 0 16px',
    color: 'fg',
    fontFamily: 'heading',
    fontWeight: 'bold',
    lineHeight: 'short',
  },
  variants: {
    level: {
      h1: { fontSize: '3xl' },
      h2: { fontSize: '2xl' },
      h3: { fontSize: 'xl' },
      h4: { fontSize: 'lg' },
      h5: { fontSize: 'md' },
      h6: { fontSize: 'sm' },
    },
  },
  defaultVariants: { level: 'h1' },
});

export const chakraEmailHrRecipe = defineRecipe({
  className: 'chakra-email-hr',
  base: {
    m: '16px 0',
    border: 'none',
    borderColor: 'border',
    w: 'full',
  },
});

export const chakraEmailHtmlRecipe = defineRecipe({
  className: 'chakra-email-html',
});

export const chakraEmailImgRecipe = defineRecipe({
  className: 'chakra-email-img',
  base: {
    display: 'block',
    border: 'none',
  },
});

export const chakraEmailLinkRecipe = defineRecipe({
  className: 'chakra-email-link',
  base: {
    color: 'accent',
    textDecoration: 'underline',
  },
});

export const chakraEmailPreRecipe = defineRecipe({
  className: 'chakra-email-pre',
  base: {
    m: '0 0 16px',
    p: 4,
    bg: 'bg.muted',
    color: 'fg',
    rounded: 'md',
    fontFamily: 'mono',
    fontSize: 'sm',
    lineHeight: 'base',
    style: {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    },
  },
});

export const chakraEmailRowRecipe = defineRecipe({
  className: 'chakra-email-row',
});

export const chakraEmailSpacerRecipe = defineRecipe({
  className: 'chakra-email-spacer',
  base: { fontSize: 0 },
});

export const chakraEmailTextRecipe = defineRecipe({
  className: 'chakra-email-text',
  base: {
    m: '0 0 16px',
    color: 'fg',
    fontSize: 'md',
    lineHeight: 'base',
  },
});

export const chakraEmailRecipes = {
  [chakraEmailRecipeKeys.badge]: chakraEmailBadgeRecipe,
  [chakraEmailRecipeKeys.blockquote]: chakraEmailBlockquoteRecipe,
  [chakraEmailRecipeKeys.body]: chakraEmailBodyRecipe,
  [chakraEmailRecipeKeys.box]: chakraEmailBoxRecipe,
  [chakraEmailRecipeKeys.code]: chakraEmailCodeRecipe,
  [chakraEmailRecipeKeys.column]: chakraEmailColumnRecipe,
  [chakraEmailRecipeKeys.heading]: chakraEmailHeadingRecipe,
  [chakraEmailRecipeKeys.hr]: chakraEmailHrRecipe,
  [chakraEmailRecipeKeys.html]: chakraEmailHtmlRecipe,
  [chakraEmailRecipeKeys.img]: chakraEmailImgRecipe,
  [chakraEmailRecipeKeys.link]: chakraEmailLinkRecipe,
  [chakraEmailRecipeKeys.pre]: chakraEmailPreRecipe,
  [chakraEmailRecipeKeys.row]: chakraEmailRowRecipe,
  [chakraEmailRecipeKeys.spacer]: chakraEmailSpacerRecipe,
  [chakraEmailRecipeKeys.text]: chakraEmailTextRecipe,
};

export const chakraEmailThemeConfig = {
  theme: { recipes: chakraEmailRecipes },
};

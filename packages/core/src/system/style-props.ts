import type { CSSProperties } from 'react';
import type { EmailTheme } from '../theme/index.js';
import { filterEmailUnsafeStyles } from './email-safe.js';
import {
  resolveBorder,
  resolveBorderWidth,
  resolveColor,
  resolveFontFamily,
  resolveFontSize,
  resolveFontWeight,
  resolveLetterSpacing,
  resolveLineHeight,
  resolveRadius,
  resolveSize,
  resolveSpacing,
} from './tokens.js';

export interface ChakraEmailStyleProps extends ChakraEmailBaseStyleProps {
  _light?: ChakraEmailBaseStyleProps;
  _dark?: ChakraEmailBaseStyleProps;
}

/** Shallow mode overrides keep public style types bounded. */
export interface ChakraEmailBaseStyleProps {
  bg?: string;
  bgColor?: string;
  background?: string;
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  p?: string | number;
  px?: string | number;
  py?: string | number;
  pt?: string | number;
  pb?: string | number;
  pl?: string | number;
  pr?: string | number;
  m?: string | number;
  mx?: string | number;
  my?: string | number;
  mt?: string | number;
  mb?: string | number;
  ml?: string | number;
  mr?: string | number;
  w?: string | number;
  width?: string | number;
  h?: string | number;
  height?: string | number;
  maxW?: string | number;
  maxWidth?: string | number;
  minW?: string | number;
  minWidth?: string | number;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: string | number;
  letterSpacing?: string | number;
  textAlign?: CSSProperties['textAlign'];
  textDecoration?: CSSProperties['textDecoration'];
  textTransform?: CSSProperties['textTransform'];
  border?: string;
  borderWidth?: string | number;
  borderRadius?: string | number;
  rounded?: string | number;
  borderTop?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRight?: string;
  display?: CSSProperties['display'];
  verticalAlign?: CSSProperties['verticalAlign'];
  style?: CSSProperties;
}

export const chakraStylePropNames = new Set<keyof ChakraEmailStyleProps>([
  '_light',
  '_dark',
  'bg',
  'bgColor',
  'background',
  'backgroundColor',
  'color',
  'borderColor',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'w',
  'width',
  'h',
  'height',
  'maxW',
  'maxWidth',
  'minW',
  'minWidth',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecoration',
  'textTransform',
  'border',
  'borderWidth',
  'borderRadius',
  'rounded',
  'borderTop',
  'borderBottom',
  'borderLeft',
  'borderRight',
  'display',
  'verticalAlign',
  'style',
]);

export function splitStyleProps<T extends Record<string, unknown>>(
  props: T,
): [ChakraEmailStyleProps, Omit<T, keyof ChakraEmailStyleProps>] {
  const styleProps: Record<string, unknown> = {};
  const elementProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (chakraStylePropNames.has(key as keyof ChakraEmailStyleProps)) {
      styleProps[key] = value;
    } else {
      elementProps[key] = value;
    }
  }

  return [
    styleProps as ChakraEmailStyleProps,
    elementProps as Omit<T, keyof ChakraEmailStyleProps>,
  ];
}

export function mapChakraPropsToStyles(
  props: ChakraEmailStyleProps,
  theme: EmailTheme,
): CSSProperties {
  const { _light, _dark, ...base } = props;
  const condition = theme.colorMode === 'dark' ? _dark : _light;
  if (_light || _dark) {
    return {
      ...mapChakraPropsToStyles(base, theme),
      ...mapChakraPropsToStyles(condition ?? {}, theme),
    };
  }
  const styles: CSSProperties = {};

  const backgroundColor = props.backgroundColor ?? props.bgColor ?? props.bg;
  if (backgroundColor) {
    styles.backgroundColor = resolveColor(backgroundColor, theme);
  }

  if (props.background) {
    styles.background = resolveColor(props.background, theme);
  }

  if (props.color) {
    styles.color = resolveColor(props.color, theme);
  }

  if (props.borderColor) {
    styles.borderColor = resolveColor(props.borderColor, theme);
  }

  if (props.p !== undefined) {
    styles.padding = resolveSpacing(props.p, theme);
  }
  if (props.px !== undefined) {
    styles.paddingLeft = resolveSpacing(props.px, theme);
    styles.paddingRight = resolveSpacing(props.px, theme);
  }
  if (props.py !== undefined) {
    styles.paddingTop = resolveSpacing(props.py, theme);
    styles.paddingBottom = resolveSpacing(props.py, theme);
  }
  if (props.pt !== undefined) {
    styles.paddingTop = resolveSpacing(props.pt, theme);
  }
  if (props.pb !== undefined) {
    styles.paddingBottom = resolveSpacing(props.pb, theme);
  }
  if (props.pl !== undefined) {
    styles.paddingLeft = resolveSpacing(props.pl, theme);
  }
  if (props.pr !== undefined) {
    styles.paddingRight = resolveSpacing(props.pr, theme);
  }

  if (props.m !== undefined) {
    styles.margin = resolveSpacing(props.m, theme);
  }
  if (props.mx !== undefined) {
    styles.marginLeft = resolveSpacing(props.mx, theme);
    styles.marginRight = resolveSpacing(props.mx, theme);
  }
  if (props.my !== undefined) {
    styles.marginTop = resolveSpacing(props.my, theme);
    styles.marginBottom = resolveSpacing(props.my, theme);
  }
  if (props.mt !== undefined) {
    styles.marginTop = resolveSpacing(props.mt, theme);
  }
  if (props.mb !== undefined) {
    styles.marginBottom = resolveSpacing(props.mb, theme);
  }
  if (props.ml !== undefined) {
    styles.marginLeft = resolveSpacing(props.ml, theme);
  }
  if (props.mr !== undefined) {
    styles.marginRight = resolveSpacing(props.mr, theme);
  }

  if (props.w !== undefined) {
    styles.width = resolveSize(props.w, theme);
  }
  if (props.width !== undefined) {
    styles.width = resolveSize(props.width, theme);
  }
  if (props.h !== undefined) {
    styles.height = resolveSize(props.h, theme);
  }
  if (props.height !== undefined) {
    styles.height = resolveSize(props.height, theme);
  }
  if (props.maxW !== undefined) {
    styles.maxWidth = resolveSize(props.maxW, theme);
  }
  if (props.maxWidth !== undefined) {
    styles.maxWidth = resolveSize(props.maxWidth, theme);
  }
  if (props.minW !== undefined) {
    styles.minWidth = resolveSize(props.minW, theme);
  }
  if (props.minWidth !== undefined) {
    styles.minWidth = resolveSize(props.minWidth, theme);
  }

  if (props.fontSize !== undefined) {
    styles.fontSize = resolveFontSize(props.fontSize, theme);
  }
  if (props.fontWeight !== undefined) {
    styles.fontWeight = resolveFontWeight(props.fontWeight, theme);
  }
  if (props.fontFamily) {
    styles.fontFamily = resolveFontFamily(props.fontFamily, theme);
  }
  if (props.lineHeight !== undefined) {
    styles.lineHeight = resolveLineHeight(props.lineHeight, theme);
  }
  if (props.letterSpacing !== undefined) {
    styles.letterSpacing = resolveLetterSpacing(props.letterSpacing, theme);
  }
  if (props.textAlign) {
    styles.textAlign = props.textAlign;
  }
  if (props.textDecoration) {
    styles.textDecoration = props.textDecoration;
  }
  if (props.textTransform) {
    styles.textTransform = props.textTransform;
  }

  if (props.border) {
    styles.border = resolveBorder(props.border, theme);
  }
  if (props.borderWidth !== undefined) {
    styles.borderWidth = resolveBorderWidth(props.borderWidth, theme);
  }
  if (props.borderRadius !== undefined || props.rounded !== undefined) {
    styles.borderRadius = resolveRadius(
      props.borderRadius ?? props.rounded,
      theme,
    );
  }
  if (props.borderTop) {
    styles.borderTop = props.borderTop;
  }
  if (props.borderBottom) {
    styles.borderBottom = props.borderBottom;
  }
  if (props.borderLeft) {
    styles.borderLeft = props.borderLeft;
  }
  if (props.borderRight) {
    styles.borderRight = props.borderRight;
  }

  if (props.display) {
    styles.display = props.display;
  }
  if (props.verticalAlign) {
    styles.verticalAlign = props.verticalAlign;
  }

  return filterEmailUnsafeStyles({ ...styles, ...props.style });
}

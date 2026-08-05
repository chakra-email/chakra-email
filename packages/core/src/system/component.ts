import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../theme/index.js';
import {
  mapChakraPropsToStyles,
  type ChakraEmailStyleProps,
} from './style-props.js';

export interface BaseChakraEmailProps extends ChakraEmailStyleProps {
  id?: string;
  className?: string;
  title?: string;
  children?: ReactNode;
}

export function useChakraStyles(
  props: ChakraEmailStyleProps,
  defaults?: ChakraEmailStyleProps,
): CSSProperties {
  const theme = useTheme();

  if (defaults === undefined) {
    return mapChakraPropsToStyles(props, theme);
  }

  const defaultStyles = { ...mapChakraPropsToStyles(defaults, theme) };
  const overrideStyles = mapChakraPropsToStyles(props, theme);

  // Reinsert overridden properties in the caller layer's order. This matters
  // for CSS shorthand/longhand pairs such as `p` + `pl`: a plain object spread
  // updates an existing key without moving it after the shorthand.
  for (const property of Object.keys(overrideStyles) as Array<
    keyof CSSProperties
  >) {
    delete defaultStyles[property];
  }

  return { ...defaultStyles, ...overrideStyles };
}

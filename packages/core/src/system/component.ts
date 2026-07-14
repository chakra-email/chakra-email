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

export function useChakraStyles(props: ChakraEmailStyleProps): CSSProperties {
  return mapChakraPropsToStyles(props, useTheme());
}

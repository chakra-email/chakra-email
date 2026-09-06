import { getEmailStyleProps } from '../system/color-mode.js';
import type { ImgHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useRecipeStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { chakraEmailRecipeKeys } from '../theme/index.js';
import {
  sanitizeEmailUrl,
  useEmailUrlPolicy,
  type EmailUrlPolicy,
} from '../security/index.js';
import { getLegacyWidthAttribute } from './layout-styles.js';

export function sanitizeImageSrc(
  src: string,
  policy?: EmailUrlPolicy,
): string | undefined {
  return sanitizeEmailUrl(src, { kind: 'image', policy });
}

function getLegacyPixelDimension(
  value: ReturnType<typeof useRecipeStyles>['width'],
): number | undefined {
  const dimension = getLegacyWidthAttribute(value);
  return typeof dimension === 'number' ? dimension : undefined;
}

export interface ImgProps
  extends
    BaseChakraEmailProps,
    Omit<
      ImgHTMLAttributes<HTMLImageElement>,
      keyof BaseChakraEmailProps | 'src' | 'alt'
    > {
  src: string;
  alt: string;
  urlPolicy?: EmailUrlPolicy;
  width?: string | number;
  height?: string | number;
}

export function Img({
  src,
  alt,
  urlPolicy,
  width,
  height,
  ...props
}: ImgProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const sanitizeUrl = useEmailUrlPolicy('image', urlPolicy);
  const styles = useRecipeStyles(chakraEmailRecipeKeys.img, undefined, {
    width,
    height,
    ...styleProps,
  });
  const legacyWidth = getLegacyPixelDimension(styles.width);
  const legacyHeight = getLegacyPixelDimension(styles.height);

  return (
    <img
      {...elementProps}
      src={sanitizeUrl(src)}
      alt={alt}
      width={legacyWidth}
      height={legacyHeight}
      {...getEmailStyleProps(styles, elementProps.className)}
    />
  );
}

import type { ImgHTMLAttributes } from 'react';
import {
  splitStyleProps,
  useChakraStyles,
  type BaseChakraEmailProps,
} from '../system/index.js';
import { getLegacyWidthAttribute } from './layout-styles.js';

const SAFE_IMAGE_PROTOCOLS = new Set(['http', 'https', 'cid']);
const IMAGE_PROTOCOL_PATTERN = /^([a-z][a-z0-9+.-]*):/i;

export function sanitizeImageSrc(src: string): string | undefined {
  const normalizedSrc = src.trimStart();
  const protocol =
    IMAGE_PROTOCOL_PATTERN.exec(normalizedSrc)?.[1]?.toLowerCase();

  if (protocol === undefined || !SAFE_IMAGE_PROTOCOLS.has(protocol)) {
    return undefined;
  }

  if (protocol === 'cid') {
    const contentId = normalizedSrc.slice(protocol.length + 1).trim();
    return contentId && !/\s/.test(contentId) ? src : undefined;
  }

  if (!normalizedSrc.toLowerCase().startsWith(`${protocol}://`)) {
    return undefined;
  }

  try {
    const url = new URL(normalizedSrc);
    return url.protocol === `${protocol}:` && url.hostname ? src : undefined;
  } catch {
    return undefined;
  }
}

function getLegacyPixelDimension(
  value: ReturnType<typeof useChakraStyles>['width'],
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
  width?: string | number;
  height?: string | number;
}

export function Img({ src, alt, width, height, ...props }: ImgProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles(
    { width, height, ...styleProps },
    {
      display: 'block',
      border: 'none',
    },
  );
  const legacyWidth = getLegacyPixelDimension(styles.width);
  const legacyHeight = getLegacyPixelDimension(styles.height);

  return (
    <img
      {...elementProps}
      src={sanitizeImageSrc(src)}
      alt={alt}
      width={legacyWidth}
      height={legacyHeight}
      style={styles}
    />
  );
}

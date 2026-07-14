import type { ImgHTMLAttributes } from 'react';
import { splitStyleProps, useChakraStyles, type BaseChakraEmailProps } from '../system/index.js';

export interface ImgProps
  extends BaseChakraEmailProps,
    Omit<ImgHTMLAttributes<HTMLImageElement>, keyof BaseChakraEmailProps | 'src' | 'alt'> {
  src: string;
  alt: string;
  width?: string | number;
  height?: string | number;
}

export function Img({ src, alt, width, height, ...props }: ImgProps) {
  const [styleProps, elementProps] = splitStyleProps(props);
  const styles = useChakraStyles({
    display: 'block',
    border: 'none',
    width,
    height,
    ...styleProps,
  });

  return (
    <img
      {...elementProps}
      src={src}
      alt={alt}
      width={typeof width === 'number' ? width : undefined}
      height={typeof height === 'number' ? height : undefined}
      style={styles}
    />
  );
}

import type { ImageProps } from "next/image";
import Image from "next/image";

// public/logo-small.svg is 176 x 168: the logo drawn for small sizes, with a
// border that stays visible down to favicon size.
const WIDTH = 176;
const HEIGHT = 168;

export type JitaSpaceIconProps = Omit<ImageProps, "src" | "alt"> &
  Partial<Pick<ImageProps, "alt">>;

export const JitaSpaceIcon = ({
  alt,
  width = WIDTH,
  height,
  ...otherProps
}: JitaSpaceIconProps) => {
  return (
    <Image
      src="/logo-small.svg"
      alt={alt ?? "JitaSpace"}
      width={width}
      height={height ?? Math.round((Number(width) * HEIGHT) / WIDTH)}
      {...otherProps}
    />
  );
};

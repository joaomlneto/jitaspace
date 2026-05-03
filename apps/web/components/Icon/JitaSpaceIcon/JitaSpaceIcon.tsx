import type { ImageProps } from "next/image";
import Image from "next/image";

import IconImageFile from "./icon.png";

export type JitaSpaceIconProps = Omit<ImageProps, "src" | "alt"> &
  Partial<Pick<ImageProps, "alt">>;

export const JitaSpaceIcon = ({ alt, ...otherProps }: JitaSpaceIconProps) => {
  return <Image src={IconImageFile} alt={alt ?? "JitaSpace"} {...otherProps} />;
};

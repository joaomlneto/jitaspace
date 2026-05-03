import type { ImageProps } from "next/image";
import Image from "next/image";

import IconImageFile from "./icon.png";

export type ZkillboardIconProps = Omit<ImageProps, "src" | "alt"> &
  Partial<Pick<ImageProps, "alt">>;

export const ZkillboardIcon = ({ alt, ...otherProps }: ZkillboardIconProps) => {
  return (
    <Image src={IconImageFile} alt={alt ?? "Zkillboard"} {...otherProps} />
  );
};

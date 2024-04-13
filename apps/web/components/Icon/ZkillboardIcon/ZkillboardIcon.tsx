import React from "react";
import Image, { ImageProps } from "next/image";

import PartnerBadgeImage from "./icon.png";

export type PartnerBadgeProps = Omit<ImageProps, "src" | "alt"> &
  Partial<Pick<ImageProps, "alt">>;

export const ZkillboardIcon = ({ alt, ...otherProps }: PartnerBadgeProps) => {
  return (
    <Image
      src={PartnerBadgeImage}
      alt={alt ?? "EVE Online Partner"}
      {...otherProps}
    />
  );
};

import type { ImageProps } from "next/image";
import Image from "next/image";

import PartnerBadgeImage from "./partner-badge-2-trimmed.png";

export type PartnerBadgeProps = Omit<ImageProps, "src" | "alt"> &
  Partial<Pick<ImageProps, "alt">>;

export const PartnerBadge = ({ alt, ...otherProps }: PartnerBadgeProps) => {
  return (
    <Image
      src={PartnerBadgeImage}
      alt={alt ?? "EVE Online Partner"}
      {...otherProps}
    />
  );
};

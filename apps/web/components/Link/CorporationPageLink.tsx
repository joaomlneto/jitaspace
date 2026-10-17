import type { LinkProps } from "next/link";

import { HoverPrefetchLink } from "./HoverPrefetchLink";

export type CorporationPageLinkProps = Omit<LinkProps, "href"> & {
  corporationId: number | string;
};

export const CorporationPageLink = ({
  corporationId,
  ...otherProps
}: CorporationPageLinkProps) => {
  return (
    <HoverPrefetchLink href={`/corporation/${corporationId}`} {...otherProps} />
  );
};

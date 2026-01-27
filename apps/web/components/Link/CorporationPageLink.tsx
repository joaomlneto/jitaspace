import type { LinkProps } from "next/link";
import Link from "next/link";

export type CorporationPageLinkProps = Omit<LinkProps, "href"> & {
  corporationId: number | string | null;
};

export const CorporationPageLink = ({
  corporationId,
  ...otherProps
}: CorporationPageLinkProps) => {
  return (
    <Link
      href={corporationId ? `/corporation/${corporationId}` : "#"}
      {...otherProps}
    />
  );
};

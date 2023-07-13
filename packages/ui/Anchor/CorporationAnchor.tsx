import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

export type CorporationNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref"> & {
    corporationId: string | number;
  };

export const CorporationAnchor = memo(
  ({ corporationId, children, ...otherProps }: CorporationNameAnchorProps) => {
    return (
      <Anchor
        component={Link}
        href={`/corporation/${corporationId}/`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
CorporationAnchor.displayName = "CorporationNameAnchor";

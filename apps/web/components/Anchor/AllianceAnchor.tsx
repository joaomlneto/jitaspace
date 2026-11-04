"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type AllianceNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    allianceId?: string | number | null;
  };

export const AllianceAnchor = memo(
  ({
    allianceId,
    children,
    prefetch,
    ...otherProps
  }: AllianceNameAnchorProps) => {
    // While the id is nullish the children render unlinked, so the href never
    // reads `/alliance/undefined` (see CorporationAnchor).
    if (allianceId === null || allianceId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/alliance/${allianceId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
AllianceAnchor.displayName = "AllianceNameAnchor";

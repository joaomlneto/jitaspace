"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type CorporationNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    corporationId?: string | number | null;
  };

/**
 * Links to a corporation page.
 *
 * `corporationId` is optional because callers read it off a query result that
 * has not resolved on first render. While it is nullish the children render
 * unlinked, rather than emitting `/corporation/undefined` for `next/link` to
 * prefetch. This matches `TypeAnchor`, `CharacterAnchor` and `FactionAnchor`,
 * which already accept an optional id.
 */
export const CorporationAnchor = memo(
  ({
    corporationId,
    children,
    prefetch,
    ...otherProps
  }: CorporationNameAnchorProps) => {
    if (corporationId === null || corporationId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={Link}
        href={`/corporation/${corporationId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
CorporationAnchor.displayName = "CorporationNameAnchor";

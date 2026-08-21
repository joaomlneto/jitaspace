"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type BloodlineAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    bloodlineId?: string | number | null;
  };

/**
 * Links to a bloodline page.
 *
 * Bloodlines are SDE reference data rather than ESI-resolvable entities, so
 * this cannot route through `EveEntityAnchor` — and does not need to, since
 * the destination follows from the id alone with no name lookup.
 *
 * `bloodlineId` is optional because callers read it off a query result that has
 * not resolved on first render. While it is nullish the children render
 * unlinked: interpolating `undefined` into the href produced
 * `/bloodline/undefined`, which `next/link` then prefetched ~46k times a day in
 * production — the single largest wasted route on the site.
 */
export const BloodlineAnchor = memo(
  ({
    bloodlineId,
    children,
    prefetch,
    ...otherProps
  }: BloodlineAnchorProps) => {
    // An <a> without href is the HTML placeholder for "a link might go here",
    // so the row keeps its styling and layout while the id loads.
    if (bloodlineId === null || bloodlineId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={Link}
        href={`/bloodline/${bloodlineId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
BloodlineAnchor.displayName = "BloodlineAnchor";

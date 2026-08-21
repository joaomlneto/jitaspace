"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type RaceAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    raceId?: string | number | null;
  };

/**
 * Links to a race page.
 *
 * Races are SDE reference data rather than ESI-resolvable entities, so this
 * cannot route through `EveEntityAnchor` — and does not need to, since the
 * destination follows from the id alone with no name lookup.
 *
 * `raceId` is optional because callers read it off a query result that has not
 * resolved on first render. While it is nullish the children render unlinked:
 * interpolating `undefined` into the href produced `/race/undefined`, which
 * `next/link` then prefetched ~37k times a day in production.
 */
export const RaceAnchor = memo(
  ({ raceId, children, prefetch, ...otherProps }: RaceAnchorProps) => {
    // An <a> without href is the HTML placeholder for "a link might go here",
    // so the row keeps its styling and layout while the id loads.
    if (raceId === null || raceId === undefined) {
      return <Anchor {...otherProps}>{children}</Anchor>;
    }

    return (
      <Anchor
        component={Link}
        href={`/race/${raceId}`}
        prefetch={prefetch}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
RaceAnchor.displayName = "RaceAnchor";

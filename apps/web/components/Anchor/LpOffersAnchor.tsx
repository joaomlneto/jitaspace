"use client";

import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";
import { formatInteger } from "~/lib/format";

export interface LpOffersAnchorProps {
  corporationId: number;
  /** How many offers the corporation's LP store carries. */
  count: number;
}

/**
 * A corporation's LP offer count, linked to its LP store, or a dash when it
 * has none. Used in the corporation tables on the race and faction pages.
 */
export function LpOffersAnchor({
  corporationId,
  count,
}: Readonly<LpOffersAnchorProps>) {
  if (count <= 0) return "–";

  return (
    <Anchor component={HoverPrefetchLink} href={`/lp-store/${corporationId}`}>
      {formatInteger(count)}
    </Anchor>
  );
}

"use client";

import type { MantineSize } from "@mantine/core";
import type { ReactNode } from "react";
import { useState } from "react";
import { Spoiler } from "@mantine/core";

// Collapse lists past ~20 rows.
const SPOILER_MAX_HEIGHT = 520;

// Rows mounted while collapsed. The Spoiler only clips, so mounting every row
// just to hide it put whole lists into the server-rendered page — tens of
// thousands of rows on the largest builds. This many rows still overflows the
// clip at the smallest row height used here (~19px), which the Spoiler needs in
// order to show its control; the rest mount on "Show all".
const COLLAPSED_ROWS = 40;

/** A Spoiler that mounts only the rows it can show until it is expanded. */
export function RowSpoiler<T>({
  items,
  fz,
  children,
}: Readonly<{
  items: T[];
  fz: MantineSize;
  children: (visible: T[]) => ReactNode;
}>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Spoiler
      maxHeight={SPOILER_MAX_HEIGHT}
      expanded={expanded}
      onExpandedChange={setExpanded}
      showLabel={`Show all ${items.length.toLocaleString()}`}
      hideLabel="Show less"
      fz={fz}
    >
      {children(expanded ? items : items.slice(0, COLLAPSED_ROWS))}
    </Spoiler>
  );
}

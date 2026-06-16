"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type EveEntityAnchorDisplayProps = Omit<
  AnchorProps,
  "component" | "href"
> &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    /** The already-resolved destination URL. */
    href: string;
  };

/**
 * Pure, hook-free anchor that links to an already-resolved `href`. The
 * data-fetching twin that resolves an entity id/category into a URL lives in
 * `@jitaspace/eve-components` (`EveEntityAnchor`); keeping this renderer in
 * `@jitaspace/ui` lets the package stay free of ESI/data dependencies.
 */
export const EveEntityAnchorDisplay = memo(
  ({ href, children, ...props }: EveEntityAnchorDisplayProps) => {
    return (
      <Anchor component={Link} href={href} {...props}>
        {children}
      </Anchor>
    );
  },
);
EveEntityAnchorDisplay.displayName = "EveEntityAnchorDisplay";

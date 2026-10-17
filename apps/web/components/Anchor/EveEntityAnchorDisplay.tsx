"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type EveEntityAnchorDisplayProps = Omit<
  AnchorProps,
  "component" | "href"
> &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    /** The already-resolved destination URL. */
    href: string;
  };

/**
 * Pure, hook-free anchor that links to an already-resolved `href`. Its
 * data-fetching twin, `EveEntityAnchor`, resolves an entity id/category into
 * the URL; this renderer stays free of ESI/data dependencies.
 */
export const EveEntityAnchorDisplay = memo(
  ({ href, children, ...props }: EveEntityAnchorDisplayProps) => {
    return (
      <Anchor component={HoverPrefetchLink} href={href} {...props}>
        {children}
      </Anchor>
    );
  },
);
EveEntityAnchorDisplay.displayName = "EveEntityAnchorDisplay";

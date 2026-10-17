"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type DungeonAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    dungeonId?: string | number | null;
  };

export const DungeonAnchor = memo(
  ({ dungeonId, children, ...otherProps }: DungeonAnchorProps) => {
    if (dungeonId === null || dungeonId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/dungeon/${dungeonId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
DungeonAnchor.displayName = "DungeonAnchor";

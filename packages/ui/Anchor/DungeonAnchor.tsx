"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type DungeonAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    dungeonId?: string | number;
  };

export const DungeonAnchor = memo(
  ({ dungeonId, children, ...otherProps }: DungeonAnchorProps) => {
    if (dungeonId === undefined) {
      return children;
    }

    return (
      <Anchor component={Link} href={`/dungeon/${dungeonId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
DungeonAnchor.displayName = "DungeonAnchor";

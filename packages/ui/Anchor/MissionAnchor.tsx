"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import Link from "next/link";
import { Anchor } from "@mantine/core";

export type MissionAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    missionId?: string | number;
  };

export const MissionAnchor = memo(
  ({ missionId, children, ...otherProps }: MissionAnchorProps) => {
    if (missionId === undefined) {
      return children;
    }

    return (
      <Anchor component={Link} href={`/mission/${missionId}`} {...otherProps}>
        {children}
      </Anchor>
    );
  },
);
MissionAnchor.displayName = "MissionAnchor";

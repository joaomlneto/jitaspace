"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import { memo } from "react";
import { Anchor } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type MissionAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    missionId?: string | number | null;
  };

export const MissionAnchor = memo(
  ({ missionId, children, ...otherProps }: MissionAnchorProps) => {
    if (missionId === null || missionId === undefined) {
      return children;
    }

    return (
      <Anchor
        component={HoverPrefetchLink}
        href={`/mission/${missionId}`}
        {...otherProps}
      >
        {children}
      </Anchor>
    );
  },
);
MissionAnchor.displayName = "MissionAnchor";

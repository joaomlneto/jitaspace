"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";

import type { ResolvableEntityCategory } from "@jitaspace/hooks";

import { EveEntityAnchor } from "./EveEntityAnchor";

// ESI's calendar `owner_type` values that map onto an entity category
// `useEsiName` can resolve. `eve_server` is handled separately below (it has no
// entity page), and any value ESI adds later resolves by ID-range inference
// rather than being forwarded as a bogus category hint.
const OWNER_TYPE_CATEGORIES: Record<
  string,
  ResolvableEntityCategory | undefined
> = {
  alliance: "alliance",
  character: "character",
  corporation: "corporation",
  faction: "faction",
};

export type CalendarEventOwnerAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    ownerId?: number;
    ownerType?: string;
  };

export const CalendarEventOwnerAnchor = memo(
  ({
    ownerId,
    ownerType,
    children,
    ...otherProps
  }: CalendarEventOwnerAnchorProps) => {
    if (ownerType === "eve_server") {
      return <>{children}</>;
    }

    return (
      <EveEntityAnchor
        entityId={ownerId}
        category={ownerType ? OWNER_TYPE_CATEGORIES[ownerType] : undefined}
        {...otherProps}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
CalendarEventOwnerAnchor.displayName = "CalendarEventOwnerAnchor";

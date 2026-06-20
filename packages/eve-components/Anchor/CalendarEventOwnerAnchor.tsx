"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";

import { EveEntityAnchor } from "./EveEntityAnchor";

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
      <EveEntityAnchor entityId={ownerId} category={ownerType} {...otherProps}>
        {children}
      </EveEntityAnchor>
    );
  },
);
CalendarEventOwnerAnchor.displayName = "CalendarEventOwnerAnchor";

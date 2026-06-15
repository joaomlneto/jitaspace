"use client";

import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

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

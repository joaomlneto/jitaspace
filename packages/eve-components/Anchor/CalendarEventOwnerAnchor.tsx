"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";

import type { ResolvableEntityCategory } from "@jitaspace/hooks";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type CalendarEventOwnerAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    ownerId?: number;
    // ESI's calendar owner types are all resolvable entity categories except
    // `eve_server`, which is handled below rather than passed on to
    // `EveEntityAnchor`.
    ownerType?: ResolvableEntityCategory | "eve_server";
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

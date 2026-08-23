"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";

import { EveEntityAnchor } from "@jitaspace/eve-components";
import { useCalendarEvent } from "@jitaspace/hooks";

export type CalendarEventOwnerAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    characterId?: number;
    eventId?: number;
  };

export const CalendarEventOwnerAnchor = memo(
  ({
    characterId,
    eventId,
    children,
    ...otherProps
  }: CalendarEventOwnerAnchorProps) => {
    const { data: event } = useCalendarEvent(characterId, eventId);
    const ownerType = event?.data.owner_type;

    // `eve_server` is CCP itself and has no entity page to link to. Every other
    // owner type ESI reports for an event is a `ResolvableEntityCategory`, so
    // ruling it out is what lets the rest go straight to EveEntityAnchor.
    if (ownerType === "eve_server") {
      return <>{children}</>;
    }

    return (
      <EveEntityAnchor
        entityId={event?.data.owner_id}
        category={ownerType}
        {...otherProps}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
CalendarEventOwnerAnchor.displayName = "CalendarEventOwnerAnchor";

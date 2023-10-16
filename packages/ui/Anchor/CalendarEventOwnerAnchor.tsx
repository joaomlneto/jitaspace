import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { useGetCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type CalendarEventOwnerAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    eventId?: number;
  };

export const CalendarEventOwnerAnchor = memo(
  ({ eventId, children, ...otherProps }: CalendarEventOwnerAnchorProps) => {
    const { characterId, isTokenValid, scopes, accessToken } =
      useEsiClientContext();
    const { data: event } = useGetCharactersCharacterIdCalendarEventId(
      characterId ?? 0,
      eventId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            !!eventId &&
            isTokenValid &&
            scopes.includes("esi-calendar.read_calendar_events.v1"),
        },
      },
    );

    if (event?.data.owner_type === "eve_server") {
      return children;
    }

    return (
      <EveEntityAnchor
        entityId={event?.data.owner_id}
        category={event?.data.owner_type}
        {...otherProps}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
CalendarEventOwnerAnchor.displayName = "CalendarEventOwnerAnchor";

import React, { memo } from "react";
import { type AnchorProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdCalendarEventId,
} from "@jitaspace/esi-client";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type CalendarEventOwnerAnchorProps = AnchorProps & {
  eventId?: number;
};

export const CalendarEventOwnerAnchor = memo(
  ({ eventId, children, ...otherProps }: CalendarEventOwnerAnchorProps) => {
    const { characterId, isTokenValid, scopes } = useEsiClientContext();
    const { data: event } = useGetCharactersCharacterIdCalendarEventId(
      characterId ?? 0,
      typeof eventId === "string" ? parseInt(eventId) : eventId ?? 0,
      {},
      {
        swr: {
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

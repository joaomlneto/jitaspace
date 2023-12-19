import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { useGetCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

import { EveEntityAnchor } from "./EveEntityAnchor";


export type CalendarEventOwnerAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    characterId: number;
    eventId?: number;
  };

export const CalendarEventOwnerAnchor = memo(
  ({
    characterId,
    eventId,
    children,
    ...otherProps
  }: CalendarEventOwnerAnchorProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-calendar.read_calendar_events.v1"],
    });
    const { data: event } = useGetCharactersCharacterIdCalendarEventId(
      characterId ?? 0,
      eventId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: !!eventId && accessToken !== null,
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

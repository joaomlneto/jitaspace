"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";
import { useCalendarEvent } from "@jitaspace/hooks";
import {
  AllianceName,
  CharacterName,
  CorporationName,
  EveEntityName,
  FactionName,
} from "@jitaspace/ui";

export type CalendarEventOwnerNameProps = TextProps & {
  characterId?: number;
  eventId?: number;
};

export const CalendarEventOwnerName = memo(
  ({ characterId, eventId, ...otherProps }: CalendarEventOwnerNameProps) => {
    const { data: event } = useCalendarEvent(characterId, eventId);
    const ownerId = event?.data.owner_id;
    const ownerType = event?.data.owner_type;

    if (ownerType === "alliance")
      return <AllianceName allianceId={ownerId} {...otherProps} />;
    if (ownerType === "corporation")
      return <CorporationName corporationId={ownerId} {...otherProps} />;
    if (ownerType === "character")
      return <CharacterName characterId={ownerId} {...otherProps} />;
    if (ownerType === "faction")
      return <FactionName factionId={ownerId} {...otherProps} />;
    return <EveEntityName {...otherProps} />;
  },
);
CalendarEventOwnerName.displayName = "CalendarEventOwnerName";

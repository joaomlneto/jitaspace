"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import {
  AllianceName,
  CharacterName,
  CorporationName,
  EveEntityName,
  FactionName,
} from "@jitaspace/eve-components";
import { useCalendarEvent } from "@jitaspace/hooks";

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

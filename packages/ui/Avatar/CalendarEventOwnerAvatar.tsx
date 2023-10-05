import React, { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import { useGetCharactersCharacterIdCalendarEventId } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAvatar,
  FactionAvatar,
} from "./index";

export type CalendarEventOwnerAvatarProps = Omit<AvatarProps, "src"> & {
  eventId?: number;
};

export const CalendarEventOwnerAvatar = memo(
  ({ eventId, ...otherProps }: CalendarEventOwnerAvatarProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();

    const { data: event, isLoading } =
      useGetCharactersCharacterIdCalendarEventId(
        characterId ?? 0,
        eventId ?? 0,
        undefined,
        {
          swr: {
            enabled: isTokenValid && !!eventId,
          },
        },
      );

    if (!event?.data) {
      return (
        <Skeleton
          visible={isLoading || !event?.data}
          radius={otherProps.radius}
          height={otherProps.size}
          width={otherProps.size}
          circle
        >
          <Avatar {...otherProps} />
        </Skeleton>
      );
    }

    return {
      alliance: (
        <AllianceAvatar allianceId={event.data.owner_id} {...otherProps} />
      ),
      character: (
        <CharacterAvatar characterId={event.data.owner_id} {...otherProps} />
      ),
      corporation: (
        <CorporationAvatar
          corporationId={event.data.owner_id}
          {...otherProps}
        />
      ),
      faction: (
        <FactionAvatar factionId={event.data.owner_id} {...otherProps} />
      ),
      eve_server: <AllianceAvatar allianceId={434243723} {...otherProps} />,
    }[event.data.owner_type];
  },
);
CalendarEventOwnerAvatar.displayName = "CalendarEventOwnerAvatar";

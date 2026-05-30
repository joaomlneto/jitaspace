"use client";

import type { AvatarProps } from "@mantine/core";
import React, { memo } from "react";
import { Avatar, Skeleton } from "@mantine/core";

import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAvatar,
  FactionAvatar,
} from "./index";

export type CalendarEventOwnerAvatarProps = Omit<AvatarProps, "src"> & {
  ownerId?: number;
  ownerType?: string;
};

export const CalendarEventOwnerAvatar = memo(
  ({ ownerId, ownerType, ...otherProps }: CalendarEventOwnerAvatarProps) => {
    if (!ownerId || !ownerType) {
      return (
        <Skeleton
          visible={true}
          radius={otherProps.radius}
          height={otherProps.size}
          width={otherProps.size}
          circle
        >
          <Avatar {...otherProps} />
        </Skeleton>
      );
    }

    return (
      {
        alliance: (
          <AllianceAvatar allianceId={ownerId} {...otherProps} />
        ),
        character: (
          <CharacterAvatar characterId={ownerId} {...otherProps} />
        ),
        corporation: (
          <CorporationAvatar corporationId={ownerId} {...otherProps} />
        ),
        faction: (
          <FactionAvatar factionId={ownerId} {...otherProps} />
        ),
        eve_server: <AllianceAvatar allianceId={434243723} {...otherProps} />,
      }[ownerType] ?? <Avatar {...otherProps} />
    );
  },
);
CalendarEventOwnerAvatar.displayName = "CalendarEventOwnerAvatar";

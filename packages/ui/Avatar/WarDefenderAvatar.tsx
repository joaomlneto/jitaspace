"use client";

import React, { memo } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";

import { AllianceAvatar } from "./AllianceAvatar";
import { CorporationAvatar } from "./CorporationAvatar";

export type WarDefenderAvatarProps = Omit<AvatarProps, "src"> & {
  defenderAllianceId?: number;
  defenderCorporationId?: number;
};

export const WarDefenderAvatar = memo(
  ({
    defenderAllianceId,
    defenderCorporationId,
    ...otherProps
  }: WarDefenderAvatarProps) => {
    if (defenderAllianceId) {
      return (
        <AllianceAvatar allianceId={defenderAllianceId} {...otherProps} />
      );
    }

    if (defenderCorporationId) {
      return (
        <CorporationAvatar
          corporationId={defenderCorporationId}
          {...otherProps}
        />
      );
    }

    return <Avatar {...otherProps} />;
  },
);
WarDefenderAvatar.displayName = "WarDefenderAvatar";

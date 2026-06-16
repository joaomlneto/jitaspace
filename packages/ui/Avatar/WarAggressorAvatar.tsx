"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";
import { Avatar } from "@mantine/core";

import { AllianceAvatar } from "./AllianceAvatar";
import { CorporationAvatar } from "./CorporationAvatar";

export type WarAggressorAvatarProps = Omit<AvatarProps, "src"> & {
  aggressorAllianceId?: number;
  aggressorCorporationId?: number;
};

export const WarAggressorAvatar = memo(
  ({
    aggressorAllianceId,
    aggressorCorporationId,
    ...otherProps
  }: WarAggressorAvatarProps) => {
    if (aggressorAllianceId) {
      return (
        <AllianceAvatar allianceId={aggressorAllianceId} {...otherProps} />
      );
    }

    if (aggressorCorporationId) {
      return (
        <CorporationAvatar
          corporationId={aggressorCorporationId}
          {...otherProps}
        />
      );
    }

    return <Avatar {...otherProps} />;
  },
);
WarAggressorAvatar.displayName = "WarAggressorAvatar";

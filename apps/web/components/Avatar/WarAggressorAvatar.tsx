"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useWar } from "@jitaspace/hooks";
import { WarAggressorAvatar as UIWarAggressorAvatar } from "@jitaspace/ui";

export type WarAggressorAvatarProps = Omit<AvatarProps, "src"> & {
  warId?: number;
};

export const WarAggressorAvatar = memo(
  ({ warId, ...otherProps }: WarAggressorAvatarProps) => {
    const { data: war } = useWar(warId ?? 0);
    return (
      <UIWarAggressorAvatar
        aggressorAllianceId={war?.data.aggressor.alliance_id}
        aggressorCorporationId={war?.data.aggressor.corporation_id}
        {...otherProps}
      />
    );
  },
);
WarAggressorAvatar.displayName = "WarAggressorAvatar";

"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useWar } from "@jitaspace/hooks";
import { WarDefenderAvatar as UIWarDefenderAvatar } from "@jitaspace/ui";

export type WarDefenderAvatarProps = Omit<AvatarProps, "src"> & {
  warId?: number;
};

export const WarDefenderAvatar = memo(
  ({ warId, ...otherProps }: WarDefenderAvatarProps) => {
    const { data: war } = useWar(warId ?? 0);
    return (
      <UIWarDefenderAvatar
        defenderAllianceId={war?.data.defender.alliance_id}
        defenderCorporationId={war?.data.defender.corporation_id}
        {...otherProps}
      />
    );
  },
);
WarDefenderAvatar.displayName = "WarDefenderAvatar";

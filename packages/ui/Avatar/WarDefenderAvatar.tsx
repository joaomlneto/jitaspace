import React, { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client-kubb";

import { AllianceAvatar } from "./AllianceAvatar";
import { CorporationAvatar } from "./CorporationAvatar";
import { EveEntityAvatar } from "./EveEntityAvatar";


export type WarDefenderAvatarProps = Omit<AvatarProps, "src"> & {
  warId?: number;
};

export const WarDefenderAvatar = memo(
  ({ warId, ...otherProps }: WarDefenderAvatarProps) => {
    const { data } = useGetWarsWarId(
      typeof warId === "string" ? parseInt(warId) : warId ?? 0,
      {},
      {},
      {
        query: {
          enabled: warId !== undefined,
        },
      },
    );

    if (data?.data.defender.alliance_id) {
      return (
        <AllianceAvatar
          allianceId={data?.data.defender.alliance_id}
          {...otherProps}
        />
      );
    }

    if (data?.data.defender.corporation_id) {
      return (
        <CorporationAvatar
          corporationId={data?.data.defender.corporation_id}
          {...otherProps}
        />
      );
    }

    return <EveEntityAvatar {...otherProps} />;
  },
);
WarDefenderAvatar.displayName = "WarDefenderAvatar";

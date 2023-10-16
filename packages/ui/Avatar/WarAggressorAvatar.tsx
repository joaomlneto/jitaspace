import React, { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client";

import { AllianceAvatar } from "./AllianceAvatar";
import { CorporationAvatar } from "./CorporationAvatar";
import { EveEntityAvatar } from "./EveEntityAvatar";

export type WarAggressorAvatarProps = Omit<AvatarProps, "src"> & {
  warId?: number;
};

export const WarAggressorAvatar = memo(
  ({ warId, ...otherProps }: WarAggressorAvatarProps) => {
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

    if (data?.data.aggressor.alliance_id) {
      return (
        <AllianceAvatar
          allianceId={data?.data.aggressor.alliance_id}
          {...otherProps}
        />
      );
    }

    if (data?.data.aggressor.corporation_id) {
      return (
        <CorporationAvatar
          corporationId={data?.data.aggressor.corporation_id}
          {...otherProps}
        />
      );
    }

    return <EveEntityAvatar {...otherProps} />;
  },
);
WarAggressorAvatar.displayName = "WarAggressorAvatar";

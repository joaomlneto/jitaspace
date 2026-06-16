"use client";

import type { AnchorProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { memo } from "react";

import { WarDefenderAnchor as UIWarDefenderAnchor } from "@jitaspace/eve-components";
import { useWar } from "@jitaspace/hooks";

export type WarDefenderAnchorProps = PropsWithChildren<
  AnchorProps & {
    warId?: number;
  }
>;

export const WarDefenderAnchor = memo(
  ({ warId, ...otherProps }: WarDefenderAnchorProps) => {
    const { data: war } = useWar(warId ?? 0);
    return (
      <UIWarDefenderAnchor
        defenderAllianceId={war?.data.defender.alliance_id}
        defenderCorporationId={war?.data.defender.corporation_id}
        {...otherProps}
      />
    );
  },
);
WarDefenderAnchor.displayName = "WarDefenderAnchor";

"use client";

import type { AnchorProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { memo } from "react";

import { WarAggressorAnchor as UIWarAggressorAnchor } from "@jitaspace/eve-components";
import { useWar } from "@jitaspace/hooks";

export type WarAggressorAnchorProps = PropsWithChildren<
  AnchorProps & {
    warId?: number;
  }
>;

export const WarAggressorAnchor = memo(
  ({ warId, ...otherProps }: WarAggressorAnchorProps) => {
    const { data: war } = useWar(warId ?? 0);
    return (
      <UIWarAggressorAnchor
        aggressorAllianceId={war?.data.aggressor.alliance_id}
        aggressorCorporationId={war?.data.aggressor.corporation_id}
        {...otherProps}
      />
    );
  },
);
WarAggressorAnchor.displayName = "WarAggressorAnchor";

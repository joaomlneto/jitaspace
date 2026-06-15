"use client";

import type { PropsWithChildren } from "react";
import React, { memo } from "react";
import { type AnchorProps } from "@mantine/core";
import { useWar } from "@jitaspace/hooks";
import { WarAggressorAnchor as UIWarAggressorAnchor } from "@jitaspace/ui";

export type WarAggressorAnchorProps = PropsWithChildren<
  AnchorProps & {
    warId?: number;
  }
>;

export const WarAggressorAnchor = memo(({ warId, ...otherProps }: WarAggressorAnchorProps) => {
  const { data: war } = useWar(warId ?? 0);
  return (
    <UIWarAggressorAnchor
      aggressorAllianceId={war?.data.aggressor.alliance_id}
      aggressorCorporationId={war?.data.aggressor.corporation_id}
      {...otherProps}
    />
  );
});
WarAggressorAnchor.displayName = "WarAggressorAnchor";

"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";
import { useWar } from "@jitaspace/hooks";
import { WarDefenderName as UIWarDefenderName } from "@jitaspace/ui";

export type WarDefenderNameProps = TextProps & {
  warId?: number;
};

export const WarDefenderName = memo(({ warId, ...otherProps }: WarDefenderNameProps) => {
  const { data: war } = useWar(warId ?? 0);
  return (
    <UIWarDefenderName
      defenderAllianceId={war?.data.defender.alliance_id}
      defenderCorporationId={war?.data.defender.corporation_id}
      {...otherProps}
    />
  );
});
WarDefenderName.displayName = "WarDefenderName";

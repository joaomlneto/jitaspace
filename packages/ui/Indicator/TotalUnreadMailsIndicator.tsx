import React, { memo } from "react";
import { Indicator, type IndicatorProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

export const TotalUnreadMailsIndicator = memo((props: IndicatorProps) => {
  const { characterId, isTokenValid, scopes } = useEsiClientContext();

  const canMakeQuery = isTokenValid && scopes.includes("esi-mail.read_mail.v1");

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    characterId ?? 1,
    undefined,
    {
      swr: {
        enabled: canMakeQuery,
      },
    },
  );

  return (
    <Indicator
      disabled={!canMakeQuery || labels?.data.total_unread_count === 0}
      label={`${labels?.data.total_unread_count ?? ""}`}
      {...props}
    />
  );
});
TotalUnreadMailsIndicator.displayName = "TotalUnreadMailsIndicator";

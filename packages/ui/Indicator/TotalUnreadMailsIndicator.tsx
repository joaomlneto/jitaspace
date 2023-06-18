import React, { memo } from "react";
import { Indicator, type IndicatorProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";

export const TotalUnreadMailsIndicator = memo((props: IndicatorProps) => {
  const { characterId, isTokenValid } = useEsiClientContext();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    characterId ?? 1,
    undefined,
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  return (
    <Indicator
      disabled={!isTokenValid || labels?.data.total_unread_count === 0}
      label={`${labels?.data.total_unread_count ?? ""}`}
      {...props}
    />
  );
});
TotalUnreadMailsIndicator.displayName = "TotalUnreadMailsIndicator";

import React, { memo } from "react";
import { Indicator, type IndicatorProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";

export const TotalUnreadMailsIndicator = memo((props: IndicatorProps) => {
  const { data: session, status } = useSession();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user?.id ?? 1,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );

  return (
    <Indicator
      disabled={
        status !== "authenticated" || labels?.data.total_unread_count === 0
      }
      label={`${labels?.data.total_unread_count ?? ""}`}
      {...props}
    />
  );
});
TotalUnreadMailsIndicator.displayName = "TotalUnreadMailsIndicator";

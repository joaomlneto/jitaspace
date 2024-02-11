"use client";

import React, { memo } from "react";
import { Indicator, type IndicatorProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





type TotalUnreadMailsIndicatorProps = IndicatorProps & {
  characterId: number;
};

export const TotalUnreadMailsIndicator = memo(
  ({ characterId, ...otherProps }: TotalUnreadMailsIndicatorProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-mail.read_mail.v1"],
    });

    const { data: labels } = useGetCharactersCharacterIdMailLabels(
      characterId ?? 1,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
        },
      },
    );

    return (
      <Indicator
        disabled={accessToken === null || labels?.data.total_unread_count === 0}
        label={`${labels?.data.total_unread_count ?? ""}`}
        {...otherProps}
      />
    );
  },
);
TotalUnreadMailsIndicator.displayName = "TotalUnreadMailsIndicator";

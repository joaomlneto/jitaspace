"use client";

import { memo } from "react";
import { type IndicatorProps } from "@mantine/core";
import { useCharacterMailLabels } from "@jitaspace/hooks";
import { TotalUnreadMailsIndicator as UITotalUnreadMailsIndicator } from "@jitaspace/ui";

export type TotalUnreadMailsIndicatorProps = IndicatorProps & {
  characterId?: number;
};

export const TotalUnreadMailsIndicator = memo(({ characterId, ...otherProps }: TotalUnreadMailsIndicatorProps) => {
  const { data } = useCharacterMailLabels(characterId ?? 0);
  return (
    <UITotalUnreadMailsIndicator
      totalUnreadCount={data?.data.total_unread_count}
      {...otherProps}
    />
  );
});
TotalUnreadMailsIndicator.displayName = "TotalUnreadMailsIndicator";

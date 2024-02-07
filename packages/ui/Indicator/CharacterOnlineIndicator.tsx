import React, { memo } from "react";
import { Indicator, type IndicatorProps } from "@mantine/core";

import { useCharacterOnlineStatus } from "@jitaspace/hooks";





type CharacterOnlineIndicatorProps = IndicatorProps & {
  characterId: number;
};

export const CharacterOnlineIndicator = memo(
  ({ characterId, ...otherProps }: CharacterOnlineIndicatorProps) => {
    const { data, isSuccess } = useCharacterOnlineStatus(characterId);

    console.log({ characterId, online: data?.data.online });

    return (
      <Indicator
        disabled={!isSuccess}
        color={data?.data.online ? "green" : "red"}
        {...otherProps}
      />
    );
  },
);
CharacterOnlineIndicator.displayName = "CharacterOnlineIndicator";

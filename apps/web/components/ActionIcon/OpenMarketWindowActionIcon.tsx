"use client";

import { memo, useCallback } from "react";

import { postUiOpenwindowMarketdetails } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";
import { OpenMarketWindowActionIcon as UIOpenMarketWindowActionIcon } from "@jitaspace/ui";

export interface OpenMarketWindowActionIconProps {
  typeId?: number;
  characterId?: number;
}

export const OpenMarketWindowActionIcon = memo(
  ({ typeId, characterId, ...otherProps }: OpenMarketWindowActionIconProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.open_window.v1"],
    });

    const handleOpen = useCallback(async () => {
      if (!typeId) return;
      await postUiOpenwindowMarketdetails({ type_id: typeId }, authHeaders);
    }, [typeId, authHeaders]);

    return (
      <UIOpenMarketWindowActionIcon
        onOpen={handleOpen}
        disabled={!accessToken || !typeId}
        {...otherProps}
      />
    );
  },
);
OpenMarketWindowActionIcon.displayName = "OpenMarketWindowActionIcon";

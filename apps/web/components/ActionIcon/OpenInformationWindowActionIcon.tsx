"use client";

import { memo, useCallback } from "react";

import { postUiOpenwindowInformation } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";
import { OpenInformationWindowActionIcon as UIOpenInformationWindowActionIcon } from "@jitaspace/ui";

export interface OpenInformationWindowActionIconProps {
  entityId?: number;
  characterId?: number;
}

export const OpenInformationWindowActionIcon = memo(
  ({
    entityId,
    characterId,
    ...otherProps
  }: OpenInformationWindowActionIconProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.open_window.v1"],
    });

    const handleOpen = useCallback(async () => {
      if (!entityId) return;
      await postUiOpenwindowInformation({ target_id: entityId }, authHeaders);
    }, [entityId, authHeaders]);

    return (
      <UIOpenInformationWindowActionIcon
        onOpen={handleOpen}
        disabled={!accessToken || !entityId}
        {...otherProps}
      />
    );
  },
);
OpenInformationWindowActionIcon.displayName = "OpenInformationWindowActionIcon";

"use client";

import type { AnchorProps } from "@mantine/core";
import { memo, useCallback } from "react";

import { postUiOpenwindowInformation } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";
import { OpenInformationWindowAnchor as UIOpenInformationWindowAnchor } from "@jitaspace/ui";

export type OpenInformationWindowAnchorProps = AnchorProps & {
  entityId?: number;
  characterId?: number;
};

export const OpenInformationWindowAnchor = memo(
  ({
    entityId,
    characterId,
    ...otherProps
  }: OpenInformationWindowAnchorProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.open_window.v1"],
    });

    const handleOpen = useCallback(async () => {
      if (!entityId) return;
      await postUiOpenwindowInformation({ target_id: entityId }, authHeaders);
    }, [entityId, authHeaders]);

    return (
      <UIOpenInformationWindowAnchor
        onOpen={handleOpen}
        disabled={!accessToken || !entityId}
        {...otherProps}
      />
    );
  },
);
OpenInformationWindowAnchor.displayName = "OpenInformationWindowAnchor";

"use client";

import { memo, useCallback } from "react";
import { postUiAutopilotWaypoint } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";
import { SetAutopilotDestinationActionIcon as UISetAutopilotDestinationActionIcon } from "@jitaspace/ui";

export type SetAutopilotDestinationActionIconProps = {
  destinationId?: number;
  characterId?: number;
  addToBeginning?: boolean;
  clearOtherWaypoints?: boolean;
};

export const SetAutopilotDestinationActionIcon = memo(
  ({
    destinationId,
    characterId,
    addToBeginning = false,
    clearOtherWaypoints = false,
    ...otherProps
  }: SetAutopilotDestinationActionIconProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.write_waypoint.v1"],
    });

    const handleSet = useCallback(async () => {
      if (!destinationId) return;
      await postUiAutopilotWaypoint(
        {
          destination_id: destinationId,
          add_to_beginning: addToBeginning,
          clear_other_waypoints: clearOtherWaypoints,
        },
        authHeaders,
      );
    }, [destinationId, addToBeginning, clearOtherWaypoints, authHeaders]);

    return (
      <UISetAutopilotDestinationActionIcon
        onSet={handleSet}
        disabled={!accessToken || !destinationId}
        {...otherProps}
      />
    );
  },
);
SetAutopilotDestinationActionIcon.displayName = "SetAutopilotDestinationActionIcon";

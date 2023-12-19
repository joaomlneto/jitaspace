import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconRocket } from "@tabler/icons-react";

import { postUiAutopilotWaypoint } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





type SetAutopilotDestinationActionIconProps = {
  characterId: number;
  destinationId?: string | number;
};

export const SetAutopilotDestinationActionIcon = memo(
  ({ characterId, destinationId }: SetAutopilotDestinationActionIconProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.write_waypoint.v1"],
    });

    const canSetDestination = !!destinationId && accessToken !== null;

    return (
      <Tooltip color="dark" label="Set autopilot destination">
        <ActionIcon
          disabled={!canSetDestination}
          radius="xl"
          onClick={() => {
            if (!canSetDestination) {
              showNotification({ message: "Insufficient permissions" });
            } else {
              void postUiAutopilotWaypoint(
                {
                  add_to_beginning: false,
                  clear_other_waypoints: true,
                  destination_id:
                    typeof destinationId === "string"
                      ? parseInt(destinationId)
                      : destinationId,
                },
                {
                  headers: {
                    ...authHeaders,
                  },
                },
              ).then(() => {
                showNotification({
                  message: "Autopilot destination set.",
                });
              });
            }
          }}
        >
          <IconRocket size={20} />
        </ActionIcon>
      </Tooltip>
    );
  },
);
SetAutopilotDestinationActionIcon.displayName =
  "SetAutopilotDestinationActionIcon";

import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconRocket } from "@tabler/icons-react";

import { postUiAutopilotWaypoint } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

type SetAutopilotDestinationActionIconProps = {
  destinationId?: string | number;
};

export const SetAutopilotDestinationActionIcon = memo(
  ({ destinationId }: SetAutopilotDestinationActionIconProps) => {
    const { isTokenValid, scopes } = useEsiClientContext();

    const canSetDestination =
      !!destinationId &&
      isTokenValid &&
      scopes.includes("esi-ui.write_waypoint.v1");

    return (
      <Tooltip color="dark" label="Set autopilot destination">
        <ActionIcon
          disabled={!canSetDestination}
          radius="xl"
          onClick={() => {
            if (!canSetDestination) {
              showNotification({ message: "Insufficient permissions" });
            } else {
              void postUiAutopilotWaypoint({
                add_to_beginning: false,
                clear_other_waypoints: true,
                destination_id:
                  typeof destinationId === "string"
                    ? parseInt(destinationId)
                    : destinationId,
              }).then(() => {
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
  "SetAutopilodDestinationActionIcon";

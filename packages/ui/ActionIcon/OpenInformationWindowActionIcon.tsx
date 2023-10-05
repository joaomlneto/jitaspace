import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconAppWindowFilled } from "@tabler/icons-react";

import { postUiOpenwindowInformation } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

type OpenInformationWindowActionIconProps = {
  entityId?: string | number;
};

export const OpenInformationWindowActionIcon = memo(
  ({ entityId }: OpenInformationWindowActionIconProps) => {
    const { isTokenValid, scopes } = useEsiClientContext();

    const canSetDestination =
      !!entityId && isTokenValid && scopes.includes("esi-ui.open_window.v1");

    return (
      <Tooltip color="dark" label="Open information window in the EVE client.">
        <ActionIcon
          disabled={!canSetDestination}
          radius="xl"
          onClick={() => {
            if (!canSetDestination) {
              showNotification({ message: "Insufficient permissions" });
            } else {
              void postUiOpenwindowInformation({
                target_id:
                  typeof entityId === "string" ? parseInt(entityId) : entityId,
              }).then(() => {
                showNotification({
                  message: "Information window opened in EVE client.",
                });
              });
            }
          }}
        >
          <IconAppWindowFilled size={20} />
        </ActionIcon>
      </Tooltip>
    );
  },
);
OpenInformationWindowActionIcon.displayName = "OpenInformationWindowActionIcon";

"use client";

import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconAppWindowFilled } from "@tabler/icons-react";

import { postUiOpenwindowInformation } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





type OpenInformationWindowActionIconProps = {
  characterId: number;
  entityId?: string | number;
};

export const OpenInformationWindowActionIcon = memo(
  ({ characterId, entityId }: OpenInformationWindowActionIconProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.open_window.v1"],
    });

    const canSetDestination = !!entityId && accessToken !== null;

    return (
      <Tooltip color="dark" label="Open information window in the EVE client.">
        <ActionIcon
          disabled={!canSetDestination}
          radius="xl"
          onClick={() => {
            if (!canSetDestination) {
              showNotification({ message: "Insufficient permissions" });
            } else {
              void postUiOpenwindowInformation(
                {
                  target_id:
                    typeof entityId === "string"
                      ? parseInt(entityId)
                      : entityId,
                },
                { headers: { ...authHeaders } },
              ).then(() => {
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

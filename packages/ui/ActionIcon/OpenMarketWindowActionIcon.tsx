"use client";

import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

import { postUiOpenwindowMarketdetails } from "@jitaspace/esi-client";
import { MarketIcon } from "@jitaspace/eve-icons";
import { useAccessToken } from "@jitaspace/hooks";





type OpenMarketWindowActionIconProps = {
  characterId: number;
  typeId?: string | number;
};
export const OpenMarketWindowActionIcon = memo(
  ({ characterId, typeId }: OpenMarketWindowActionIconProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.open_window.v1"],
    });

    const canSetDestination = !!typeId && accessToken !== null;

    return (
      <Tooltip color="dark" label="Open market window in the EVE client.">
        <ActionIcon
          variant="light"
          disabled={!canSetDestination}
          radius="xl"
          onClick={() => {
            if (!canSetDestination) {
              showNotification({ message: "Insufficient permissions" });
            } else {
              void postUiOpenwindowMarketdetails(
                {
                  type_id:
                    typeof typeId === "string" ? parseInt(typeId) : typeId,
                },
                {
                  headers: {
                    ...authHeaders,
                  },
                },
              ).then(() => {
                showNotification({
                  message: "Market window opened in EVE client.",
                });
              });
            }
          }}
        >
          <MarketIcon width={20} />
        </ActionIcon>
      </Tooltip>
    );
  },
);
OpenMarketWindowActionIcon.displayName = "OpenMarketWindowActionIcon";

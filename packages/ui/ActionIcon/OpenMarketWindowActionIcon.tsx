import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

import {
  postUiOpenwindowMarketdetails,
  useEsiClientContext,
} from "@jitaspace/esi-client";
import { MarketIcon } from "@jitaspace/eve-icons";

type OpenMarketWindowActionIconProps = {
  typeId?: string | number;
};
export const OpenMarketWindowActionIcon = memo(
  ({ typeId }: OpenMarketWindowActionIconProps) => {
    const { isTokenValid, scopes } = useEsiClientContext();

    const canSetDestination =
      !!typeId && isTokenValid && scopes.includes("esi-ui.open_window.v1");

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
              void postUiOpenwindowMarketdetails({
                type_id: typeof typeId === "string" ? parseInt(typeId) : typeId,
              }).then(() => {
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
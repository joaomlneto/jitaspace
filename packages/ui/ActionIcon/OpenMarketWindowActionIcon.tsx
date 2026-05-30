"use client";

import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { MarketIcon } from "@jitaspace/eve-icons";

export type OpenMarketWindowActionIconProps = {
  onOpen?: () => void;
  disabled?: boolean;
};

export const OpenMarketWindowActionIcon = memo(
  ({ onOpen, disabled }: OpenMarketWindowActionIconProps) => {
    return (
      <Tooltip color="dark" label="Open market window in the EVE client.">
        <ActionIcon
          variant="light"
          disabled={disabled || !onOpen}
          radius="xl"
          onClick={onOpen}
        >
          <MarketIcon width={20} />
        </ActionIcon>
      </Tooltip>
    );
  },
);
OpenMarketWindowActionIcon.displayName = "OpenMarketWindowActionIcon";

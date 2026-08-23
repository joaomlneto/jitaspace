"use client";

import type { ActionIconProps } from "@mantine/core";
import { memo } from "react";

import { MarketIcon } from "@jitaspace/eve-icons";

import { TooltipActionIcon } from "./TooltipActionIcon";

export type OpenMarketWindowActionIconProps = ActionIconProps & {
  onOpen?: () => void;
  disabled?: boolean;
};

export const OpenMarketWindowActionIcon = memo(
  ({
    onOpen,
    disabled,
    ...actionIconProps
  }: OpenMarketWindowActionIconProps) => {
    return (
      <TooltipActionIcon
        label="Open market window in the EVE client."
        onActivate={onOpen}
        disabled={disabled}
        variant="light"
        {...actionIconProps}
      >
        <MarketIcon width={20} />
      </TooltipActionIcon>
    );
  },
);
OpenMarketWindowActionIcon.displayName = "OpenMarketWindowActionIcon";

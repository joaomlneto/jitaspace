"use client";

import type { ActionIconProps } from "@mantine/core";
import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";

const LABEL = "Open market window in the EVE client.";

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
      <Tooltip color="dark" label={LABEL}>
        {/*
          A disabled ActionIcon gets `pointer-events: none`, so a tooltip on the
          button itself never opens — precisely in the state that most needs
          explaining, since `disabled` fires whenever no handler was passed. The
          wrapper keeps a live tooltip target while the button stays genuinely
          disabled for assistive technology.
        */}
        <span style={{ display: "inline-flex" }}>
          <ActionIcon
            // Icon-only: without this the button has no accessible name at all.
            aria-label={LABEL}
            radius="xl"
            variant="light"
            {...actionIconProps}
            disabled={!onOpen || disabled}
            onClick={onOpen}
          >
            <MarketIcon width={20} />
          </ActionIcon>
        </span>
      </Tooltip>
    );
  },
);
OpenMarketWindowActionIcon.displayName = "OpenMarketWindowActionIcon";

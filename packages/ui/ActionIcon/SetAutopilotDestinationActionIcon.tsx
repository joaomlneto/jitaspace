"use client";

import type { ActionIconProps } from "@mantine/core";
import { memo } from "react";

import { CategorySetDestinationMapIcon } from "@jitaspace/eve-icons";

import { TooltipActionIcon } from "./TooltipActionIcon";

export type SetAutopilotDestinationActionIconProps = ActionIconProps & {
  onSet?: () => void;
  disabled?: boolean;
};

export const SetAutopilotDestinationActionIcon = memo(
  ({
    onSet,
    disabled,
    ...actionIconProps
  }: SetAutopilotDestinationActionIconProps) => {
    return (
      <TooltipActionIcon
        label="Set autopilot destination"
        onActivate={onSet}
        disabled={disabled}
        {...actionIconProps}
      >
        <CategorySetDestinationMapIcon size={20} color="currentColor" alt="" />
      </TooltipActionIcon>
    );
  },
);
SetAutopilotDestinationActionIcon.displayName =
  "SetAutopilotDestinationActionIcon";

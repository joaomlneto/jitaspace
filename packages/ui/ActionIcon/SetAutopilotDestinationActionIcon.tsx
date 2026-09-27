"use client";

import type { ActionIconProps } from "@mantine/core";
import { memo } from "react";
import { IconRocket } from "@tabler/icons-react";

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
        <IconRocket size={20} />
      </TooltipActionIcon>
    );
  },
);
SetAutopilotDestinationActionIcon.displayName =
  "SetAutopilotDestinationActionIcon";

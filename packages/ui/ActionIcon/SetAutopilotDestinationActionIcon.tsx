"use client";

import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconRocket } from "@tabler/icons-react";

export type SetAutopilotDestinationActionIconProps = {
  onSet?: () => void;
  disabled?: boolean;
};

export const SetAutopilotDestinationActionIcon = memo(
  ({ onSet, disabled }: SetAutopilotDestinationActionIconProps) => {
    return (
      <Tooltip color="dark" label="Set autopilot destination">
        <ActionIcon
          disabled={disabled || !onSet}
          radius="xl"
          onClick={onSet}
        >
          <IconRocket size={20} />
        </ActionIcon>
      </Tooltip>
    );
  },
);
SetAutopilotDestinationActionIcon.displayName =
  "SetAutopilotDestinationActionIcon";

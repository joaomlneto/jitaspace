"use client";

import type { ActionIconProps } from "@mantine/core";
import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconRocket } from "@tabler/icons-react";

const LABEL = "Set autopilot destination";

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
            {...actionIconProps}
            disabled={!onSet || disabled}
            onClick={onSet}
          >
            <IconRocket size={20} />
          </ActionIcon>
        </span>
      </Tooltip>
    );
  },
);
SetAutopilotDestinationActionIcon.displayName =
  "SetAutopilotDestinationActionIcon";

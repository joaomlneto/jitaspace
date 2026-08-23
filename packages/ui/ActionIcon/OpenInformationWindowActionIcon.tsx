"use client";

import type { ActionIconProps } from "@mantine/core";
import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconAppWindowFilled } from "@tabler/icons-react";

const LABEL = "Open information window in the EVE client.";

export type OpenInformationWindowActionIconProps = ActionIconProps & {
  onOpen?: () => void;
  disabled?: boolean;
};

export const OpenInformationWindowActionIcon = memo(
  ({
    onOpen,
    disabled,
    ...actionIconProps
  }: OpenInformationWindowActionIconProps) => {
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
            disabled={!onOpen || disabled}
            onClick={onOpen}
          >
            <IconAppWindowFilled size={20} />
          </ActionIcon>
        </span>
      </Tooltip>
    );
  },
);
OpenInformationWindowActionIcon.displayName = "OpenInformationWindowActionIcon";

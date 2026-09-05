"use client";

import type { ActionIconProps } from "@mantine/core";
import { memo } from "react";
import { IconAppWindowFilled } from "@tabler/icons-react";

import { TooltipActionIcon } from "./TooltipActionIcon";

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
      <TooltipActionIcon
        label="Open information window in the EVE client."
        onActivate={onOpen}
        disabled={disabled}
        {...actionIconProps}
      >
        <IconAppWindowFilled size={20} />
      </TooltipActionIcon>
    );
  },
);
OpenInformationWindowActionIcon.displayName = "OpenInformationWindowActionIcon";

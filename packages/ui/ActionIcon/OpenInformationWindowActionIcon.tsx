"use client";

import { memo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconAppWindowFilled } from "@tabler/icons-react";

export interface OpenInformationWindowActionIconProps {
  onOpen?: () => void;
  disabled?: boolean;
}

export const OpenInformationWindowActionIcon = memo(
  ({ onOpen, disabled }: OpenInformationWindowActionIconProps) => {
    return (
      <Tooltip color="dark" label="Open information window in the EVE client.">
        <ActionIcon disabled={!onOpen || disabled} radius="xl" onClick={onOpen}>
          <IconAppWindowFilled size={20} />
        </ActionIcon>
      </Tooltip>
    );
  },
);
OpenInformationWindowActionIcon.displayName = "OpenInformationWindowActionIcon";

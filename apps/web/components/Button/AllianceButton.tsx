import { memo } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";

import { useEsiAllianceInformation } from "@jitaspace/hooks";
import { AllianceAvatar } from "@jitaspace/ui";

import classes from "./Button.module.css";


export interface AllianceButtonProps {
  allianceId?: number;
}

export const AllianceButton = memo(({ allianceId }: AllianceButtonProps) => {
  const { data } = useEsiAllianceInformation(
    allianceId ?? 0,
    {},
    {},
    { query: { enabled: allianceId !== undefined } },
  );
  return (
    <UnstyledButton className={classes.user}>
      <Group wrap="nowrap" gap="sm">
        <AllianceAvatar allianceId={allianceId} size={30} />
        <Text fz="sm" fw={500}>
          {data?.data.name}
        </Text>
      </Group>
    </UnstyledButton>
  );
});

AllianceButton.displayName = "AllianceButton";

import { memo } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";

import { useGetFactionById } from "@jitaspace/sde-client";
import { FactionAvatar } from "@jitaspace/ui";

import classes from "./Button.module.css";


export interface FactionButtonProps {
  factionId?: number;
}

export const FactionButton = memo(({ factionId }: FactionButtonProps) => {
  const { data } = useGetFactionById(factionId ?? 0, {
    query: { enabled: factionId !== undefined },
  });
  return (
    <UnstyledButton className={classes.user}>
      <Group wrap="nowrap" gap="sm">
        <FactionAvatar factionId={factionId} size={30} />
        <Text fz="sm" fw={500}>
          {data?.data.nameID.en}
        </Text>
      </Group>
    </UnstyledButton>
  );
});

FactionButton.displayName = "FactionButton";

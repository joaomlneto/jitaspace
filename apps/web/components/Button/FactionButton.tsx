import { memo } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { sdeRecordQueryOptions } from "@jitaspace/hooks";
import { FactionAvatar } from "@jitaspace/ui";

import classes from "./Button.module.css";


export interface FactionButtonProps {
  factionId?: number;
}

export const FactionButton = memo(({ factionId }: FactionButtonProps) => {
  const { data } = useQuery(sdeRecordQueryOptions("faction", factionId));
  return (
    <UnstyledButton className={classes.user}>
      <Group wrap="nowrap" gap="sm">
        <FactionAvatar factionId={factionId} size={30} />
        <Text fz="sm" fw={500}>
          {data?.name}
        </Text>
      </Group>
    </UnstyledButton>
  );
});

FactionButton.displayName = "FactionButton";

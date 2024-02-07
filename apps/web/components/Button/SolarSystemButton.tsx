import { memo } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";

import { useSolarSystem } from "@jitaspace/hooks";
import { SolarSystemAvatar } from "@jitaspace/ui";

import classes from "./Button.module.css";


export type SolarSystemButtonProps = {
  solarSystemId?: number;
};

export const SolarSystemButton = memo(
  ({ solarSystemId }: SolarSystemButtonProps) => {
    const { data } = useSolarSystem(
      solarSystemId ?? 0,
      {},
      {},
      { query: { enabled: solarSystemId !== undefined } },
    );
    return (
      <UnstyledButton className={classes.user}>
        <Group wrap="nowrap" gap="sm">
          <SolarSystemAvatar solarSystemId={solarSystemId} size={30} />
          <Text fz="sm" fw={500}>
            {data?.data.name}
          </Text>
        </Group>
      </UnstyledButton>
    );
  },
);

SolarSystemButton.displayName = "SolarSystemButton";

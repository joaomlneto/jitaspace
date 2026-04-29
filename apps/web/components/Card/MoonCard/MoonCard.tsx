"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useMoon } from "@jitaspace/hooks";
import { MoonName, SolarSystemName } from "@jitaspace/ui";

import classes from "./MoonCard.module.css";

export type MoonCardProps = Omit<CardProps, "children"> & {
  moonId: number;
};

export const MoonCard = memo(({ moonId, ...otherProps }: MoonCardProps) => {
  const { data: moon } = useMoon(moonId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <div style={{ flex: 1 }}>
            <MoonName
              moonId={moonId}
              fz="lg"
              fw={500}
              className={classes.headerName}
            />
            {moon?.data.system_id && (
              <SolarSystemName
                solarSystemId={moon.data.system_id}
                size="xs"
                c="dimmed"
              />
            )}
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
});
MoonCard.displayName = "MoonCard";

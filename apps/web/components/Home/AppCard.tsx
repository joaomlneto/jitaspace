"use client";

import Link from "next/link";
import { Card, Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

import type { JitaApp } from "~/config/apps";
import classes from "./AppCard.module.css";

export interface AppCardProps {
  app: JitaApp;
}

export function AppCard({ app }: Readonly<AppCardProps>) {
  return (
    <Tooltip
      label={app.description}
      multiline
      w={250}
      withArrow
      openDelay={200}
      position="bottom"
    >
      <UnstyledButton
        component={Link}
        href={app.url ?? "#"}
        onClick={app.onClick}
        className={classes.button}
      >
        <Card className={classes.card} padding="md">
          <Group wrap="nowrap" gap="sm" align="center">
            <div className={classes.iconBox}>
              <app.Icon width={30} height={30} alt={app.name} />
            </div>
            <Text fz="sm" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
              {app.name}
            </Text>
            <IconChevronRight size={16} stroke={1.5} className={classes.arrow} />
          </Group>
        </Card>
      </UnstyledButton>
    </Tooltip>
  );
}

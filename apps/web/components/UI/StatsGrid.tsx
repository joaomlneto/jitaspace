import React, { memo } from "react";
import {
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Text,
  type SimpleGridProps,
} from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";

import { type EveIconProps } from "@jitaspace/eve-icons";

import classes from "./StatsGrid.module.css";


type StatsGridProps = SimpleGridProps & {
  data: {
    title: string;
    icon?: (props: EveIconProps) => React.ReactElement<any>;
    value: string;
    diff?: number;
    description?: string;
  }[];
};

export const StatsGrid = memo(({ data, ...otherProps }: StatsGridProps) => {
  const stats = data.map((stat) => {
    //const Icon = icons[stat.icon];
    const DiffIcon =
      stat.diff == undefined
        ? null
        : stat.diff > 0
          ? IconArrowUpRight
          : IconArrowDownRight;

    return (
      <Paper withBorder p="md" radius="md" key={stat.title}>
        <Grid>
          <Grid.Col span="auto">
            <Text size="xs" c="dimmed" className={classes.title}>
              {stat.title}
            </Text>
          </Grid.Col>
          {stat.icon && (
            <Grid.Col span="content">
              <stat.icon width={32} className={classes.icon} />
            </Grid.Col>
          )}
        </Grid>

        <Group align="flex-end" gap="xs" mt={25}>
          <Text inherit className={classes.value}>
            {stat.value}
          </Text>
          <Text
            color={stat.diff && stat.diff > 0 ? "teal" : "red"}
            fz="sm"
            fw={500}
            className={classes.diff}
          >
            {stat.diff && <span>{stat.diff}%</span>}
            {DiffIcon && <DiffIcon size="1rem" stroke={1.5} />}
          </Text>
        </Group>

        {stat.description && (
          <Text inherit fz="xs" c="dimmed" mt={7}>
            {stat.description}
          </Text>
        )}
      </Paper>
    );
  });
  return (
    <div className={classes.root}>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} {...otherProps}>
        {stats}
      </SimpleGrid>
    </div>
  );
});
StatsGrid.displayName = "StatsGrid";

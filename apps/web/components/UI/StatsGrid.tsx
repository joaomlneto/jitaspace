import React, { memo } from "react";
import {
  createStyles,
  Grid,
  Group,
  Paper,
  rem,
  SimpleGrid,
  Text,
  type SimpleGridProps,
} from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";

import { type EveIconProps } from "@jitaspace/eve-icons";

const useStyles = createStyles((theme) => ({
  root: {
    padding: `calc(${theme.spacing.md})`,
  },

  value: {
    fontSize: rem(24),
    fontWeight: 700,
    lineHeight: 1,
  },

  diff: {
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
  },

  icon: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],
  },

  title: {
    fontWeight: 700,
    textTransform: "uppercase",
  },
}));

type StatsGridProps = SimpleGridProps & {
  data: {
    title: string;
    icon?: (props: EveIconProps) => React.ReactElement;
    value: string;
    diff?: number;
    description?: string;
  }[];
};

export const StatsGrid = memo(({ data, ...otherProps }: StatsGridProps) => {
  const { classes } = useStyles();
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
            <Text size="xs" color="dimmed" className={classes.title}>
              {stat.title}
            </Text>
          </Grid.Col>
          {stat.icon && (
            <Grid.Col span="content">
              <stat.icon width={32} className={classes.icon} />
            </Grid.Col>
          )}
        </Grid>

        <Group align="flex-end" spacing="xs" mt={25}>
          <Text className={classes.value}>{stat.value}</Text>
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
          <Text fz="xs" c="dimmed" mt={7}>
            {stat.description}
          </Text>
        )}
      </Paper>
    );
  });
  return (
    <div className={classes.root}>
      <SimpleGrid
        cols={4}
        breakpoints={[
          { maxWidth: "md", cols: 2 },
          { maxWidth: "xs", cols: 1 },
        ]}
        {...otherProps}
      >
        {stats}
      </SimpleGrid>
    </div>
  );
});
StatsGrid.displayName = "StatsGrid";

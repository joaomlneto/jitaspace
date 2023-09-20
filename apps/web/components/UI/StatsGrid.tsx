import React, { memo } from "react";
import {
  Grid,
  Group,
  Paper,
  rem,
  SimpleGrid,
  Text,
  useMantineColorScheme,
  useMantineTheme,
  type SimpleGridProps,
} from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";

import { type EveIconProps } from "@jitaspace/eve-icons";

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
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
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
            <Text
              size="xs"
              c="dimmed"
              style={{
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {stat.title}
            </Text>
          </Grid.Col>
          {stat.icon && (
            <Grid.Col span="content">
              <stat.icon
                width={32}
                style={{
                  color:
                    colorScheme === "dark"
                      ? theme.colors.dark[3]
                      : theme.colors.gray[4],
                }}
              />
            </Grid.Col>
          )}
        </Grid>

        <Group align="flex-end" gap="xs" mt={25}>
          <Text
            style={{
              fontSize: rem(24),
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {stat.value}
          </Text>
          <Text
            c={stat.diff && stat.diff > 0 ? "teal" : "red"}
            fz="sm"
            fw={500}
            style={{
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
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
    <div style={{ padding: `calc(${theme.spacing.md})` }}>
      <SimpleGrid
        cols={{
          base: 1,
          xs: 2,
          md: 4,
        }}
        {...otherProps}
      >
        {stats}
      </SimpleGrid>
    </div>
  );
});
StatsGrid.displayName = "StatsGrid";

import React, { memo } from "react";
import {
  Card,
  createStyles,
  Group,
  JsonInput,
  Stack,
  Text,
} from "@mantine/core";

import { ShipFittingCardModuleSectionEntry } from "./ShipFittingCardModuleSectionEntry";


const useStyles = createStyles((theme) => ({
  label: {
    lineHeight: 1,
    fontWeight: 700,
    fontSize: theme.fontSizes.xs,
    letterSpacing: -0.25,
    textTransform: "uppercase",
  },

  section: {
    padding: theme.spacing.xs,
    borderTop: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
  },
}));

type ShipFittingCardModulesSectionProps = {
  header: string;
  items: {
    typeId: number;
    quantity?: number;
    ammo?: { typeId?: number; quantity: number };
  }[];
  numSlots?: number;
  showEmptySlots?: boolean;
  showExcessModules?: boolean;
};

export const ShipFittingCardModulesSection = memo(
  ({
    header,
    items,
    numSlots,
    showEmptySlots,
    showExcessModules,
  }: ShipFittingCardModulesSectionProps) => {
    const { classes } = useStyles();

    const remainingSlots = numSlots
      ? numSlots -
        items.reduce((sum, module) => sum + (module.quantity ?? 1), 0)
      : 0;

    return (
      <Card.Section m={0} p="xs" className={classes.section}>
        <Stack gap={0}>
          <Text color="dimmed" className={classes.label} mb={4}>
            {header}
          </Text>
          {items.map((module) => (
            <ShipFittingCardModuleSectionEntry
              key={module.typeId}
              {...module}
            />
          ))}
          {showEmptySlots && remainingSlots > 0 && (
            <Group gap="xs" pl={26}>
              {remainingSlots > 0 && (
                <Text size="xs" color="dimmed">
                  {remainingSlots} Empty Slots
                </Text>
              )}
            </Group>
          )}
          {showExcessModules && remainingSlots < 0 && (
            <Group gap="xs" pl={26}>
              <Text size="xs" color="red">
                Too many modules
              </Text>
            </Group>
          )}
          {false && (
            <JsonInput
              value={JSON.stringify(
                {
                  header,
                  items: items,
                  numSlots,
                  showEmptySlots,
                  showExcessModules,
                },
                null,
                2,
              )}
              readOnly
              autosize
            />
          )}
        </Stack>
      </Card.Section>
    );
  },
);
ShipFittingCardModulesSection.displayName = "ShipFittingCardModulesSection";

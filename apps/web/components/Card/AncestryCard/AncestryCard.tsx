"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useAncestry } from "@jitaspace/hooks";
import { AncestryName, BloodlineName } from "@jitaspace/ui";

import classes from "./AncestryCard.module.css";

export type AncestryCardProps = Omit<CardProps, "children"> & {
  ancestryId: number;
};

export const AncestryCard = memo(
  ({ ancestryId, ...otherProps }: AncestryCardProps) => {
    const { data: ancestry } = useAncestry(ancestryId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <div style={{ flex: 1 }}>
              <AncestryName
                ancestryId={ancestryId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {ancestry?.data.bloodline_id && (
                <BloodlineName
                  bloodlineId={ancestry.data.bloodline_id}
                  size="xs"
                  c="dimmed"
                />
              )}
              {ancestry?.data.description && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {ancestry.data.description}
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
AncestryCard.displayName = "AncestryCard";

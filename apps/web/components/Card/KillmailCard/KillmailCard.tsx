"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useKillmail } from "@jitaspace/hooks";
import {
  CharacterName,
  FormattedDateText,
  SolarSystemName,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import classes from "./KillmailCard.module.css";

export type KillmailCardProps = Omit<CardProps, "children"> & {
  killmailId: number;
  killmailHash: string;
};

export const KillmailCard = memo(
  ({ killmailId, killmailHash, ...otherProps }: KillmailCardProps) => {
    const { data: killmail } = useKillmail(killmailId, killmailHash);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <TypeAvatar
              typeId={killmail?.data.victim.ship_type_id}
              size={64}
              radius="md"
            />
            <div style={{ flex: 1 }}>
              <Group justify="space-between">
                <TypeName
                  typeId={killmail?.data.victim.ship_type_id}
                  fz="lg"
                  fw={500}
                  className={classes.headerName}
                />
                <FormattedDateText
                  date={
                    killmail?.data.killmail_time
                      ? new Date(killmail.data.killmail_time)
                      : undefined
                  }
                  size="xs"
                  c="dimmed"
                />
              </Group>

              {killmail?.data.victim.character_id && (
                <CharacterName
                  characterId={killmail.data.victim.character_id}
                  size="sm"
                />
              )}

              {killmail?.data.solar_system_id && (
                <SolarSystemName
                  solarSystemId={killmail.data.solar_system_id}
                  size="xs"
                  c="dimmed"
                />
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
KillmailCard.displayName = "KillmailCard";

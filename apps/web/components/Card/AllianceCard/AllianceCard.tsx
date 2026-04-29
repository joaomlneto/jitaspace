"use client";

import type { CardProps } from "@mantine/core";
import { Card, Group, Text } from "@mantine/core";

import { useEsiAllianceInformation } from "@jitaspace/hooks";
import {
  AllianceAvatar,
  AllianceName,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  FormattedDateText,
} from "@jitaspace/ui";

import classes from "./AllianceCard.module.css";

export type AllianceCardProps = CardProps & {
  allianceId: number;
};

export const AllianceCard = ({
  allianceId,
  ...otherProps
}: AllianceCardProps) => {
  const { data: alliance } = useEsiAllianceInformation(allianceId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <AllianceAvatar allianceId={allianceId} size={96} radius="md" />
          <div>
            <Group gap="xs" align="center">
              <AllianceName
                allianceId={allianceId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {alliance?.data && (
                <Text size="sm" c="dimmed" fw={500}>
                  [{alliance.data.ticker}]
                </Text>
              )}
            </Group>

            {alliance?.data.executor_corporation_id && (
              <Group wrap="nowrap" gap="xs" mt={6}>
                <Text size="xs" c="dimmed">
                  Executor:
                </Text>
                <CorporationAvatar
                  corporationId={alliance.data.executor_corporation_id}
                  size="1rem"
                  className={classes.headerIcon}
                />
                <CorporationAnchor
                  corporationId={alliance.data.executor_corporation_id}
                >
                  <CorporationName
                    corporationId={alliance.data.executor_corporation_id}
                    fz="xs"
                    c="dimmed"
                  />
                </CorporationAnchor>
              </Group>
            )}

            {alliance?.data.date_founded && (
              <Group wrap="nowrap" gap="xs" mt={4}>
                <Text size="xs" c="dimmed">
                  Founded:
                </Text>
                <FormattedDateText
                  date={new Date(alliance.data.date_founded)}
                  size="xs"
                />
              </Group>
            )}
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
};

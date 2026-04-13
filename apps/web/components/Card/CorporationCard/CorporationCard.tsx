"use client";

import type { CardProps } from "@mantine/core";
import { Card, Group, Skeleton, Text } from "@mantine/core";

import { useCorporation } from "@jitaspace/hooks";
import {
  AllianceAnchor,
  AllianceAvatar,
  AllianceName,
  CharacterAvatar,
  CharacterName,
  CorporationAvatar,
  CorporationName,
  FormattedDateText,
} from "@jitaspace/ui";

import classes from "./CorporationCard.module.css";

export type CorporationCardProps = CardProps & {
  corporationId: number;
};

export const CorporationCard = ({
  corporationId,
  ...otherProps
}: CorporationCardProps) => {
  const { data: corporation } = useCorporation(corporationId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <CorporationAvatar
            corporationId={corporationId}
            size={96}
            radius="md"
          />
          <div>
            <Group gap="xs" align="center">
              <CorporationName
                corporationId={corporationId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {corporation?.data && (
                <Text size="sm" c="dimmed" fw={500}>
                  [{corporation.data.ticker}]
                </Text>
              )}
            </Group>

            {corporation?.data.alliance_id && (
              <Group wrap="nowrap" gap="xs" mt={6}>
                <AllianceAvatar
                  allianceId={corporation.data.alliance_id}
                  size="1rem"
                  className={classes.headerIcon}
                />
                <AllianceAnchor allianceId={corporation.data.alliance_id}>
                  <AllianceName
                    allianceId={corporation.data.alliance_id}
                    fz="xs"
                    c="dimmed"
                  />
                </AllianceAnchor>
              </Group>
            )}

            <Group wrap="nowrap" gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                CEO:
              </Text>
              <CharacterAvatar
                characterId={corporation?.data.ceo_id}
                size={16}
                radius="xl"
              />
              <CharacterName characterId={corporation?.data.ceo_id} fz="xs" />
            </Group>

            <Group wrap="nowrap" gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                Members:
              </Text>
              <Skeleton visible={!corporation} width="auto">
                <Text size="xs">
                  {corporation?.data.member_count.toLocaleString()}
                </Text>
              </Skeleton>
            </Group>

            {corporation?.data.date_founded && (
              <Group wrap="nowrap" gap="xs" mt={4}>
                <Text size="xs" c="dimmed">
                  Founded:
                </Text>
                <FormattedDateText
                  date={new Date(corporation.data.date_founded)}
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

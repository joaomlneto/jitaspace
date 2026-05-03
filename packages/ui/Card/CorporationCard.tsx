"use client";

import type { ReactNode } from "react";
import React, { memo } from "react";
import {
  Anchor,
  Badge,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useCorporation } from "@jitaspace/hooks";

import { AllianceAnchor, CharacterAnchor, CorporationAnchor } from "../Anchor";
import { AllianceAvatar, CharacterAvatar, CorporationAvatar } from "../Avatar";
import { FormattedDateText } from "../DateText";
import { AllianceName, CharacterName, CorporationName } from "../Text";

interface CorporationCardProps {
  corporationId: string | number;
  headerRightSection?: ReactNode;
}

const stripHtml = (value?: string) => {
  return value
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const CorporationCard = memo(
  ({ corporationId, headerRightSection }: CorporationCardProps) => {
    const { data: corporation } = useCorporation(Number(corporationId));
    const corporationData = corporation?.data;
    const description = stripHtml(corporationData?.description);
    const taxRate =
      corporationData?.tax_rate != null
        ? `${(corporationData.tax_rate * 100).toFixed(1)}%`
        : null;

    return (
      <Card withBorder radius="md">
        <Card.Section p="xs" withBorder>
          <Group wrap="nowrap" justify="space-between" align="start">
            <Group wrap="nowrap" align="start">
              <CorporationAvatar
                corporationId={corporationId}
                size={96}
                radius="md"
              />
              <div>
                <Group gap="xs" wrap="nowrap">
                  <CorporationAnchor corporationId={corporationId}>
                    <CorporationName
                      corporationId={corporationId}
                      fz="lg"
                      fw={500}
                    />
                  </CorporationAnchor>
                  {corporationData?.ticker && (
                    <Badge>{corporationData.ticker}</Badge>
                  )}
                </Group>

                {corporationData?.alliance_id && (
                  <Group wrap="nowrap" gap="xs" mt={6}>
                    <AllianceAvatar
                      allianceId={corporationData.alliance_id}
                      size="1rem"
                    />
                    <AllianceAnchor allianceId={corporationData.alliance_id}>
                      <AllianceName
                        allianceId={corporationData.alliance_id}
                        fz="xs"
                        c="dimmed"
                      />
                    </AllianceAnchor>
                  </Group>
                )}

                {corporationData?.ceo_id && (
                  <Group wrap="nowrap" gap="xs" mt={4}>
                    <CharacterAvatar
                      characterId={corporationData.ceo_id}
                      size="1rem"
                    />
                    <Text size="xs" c="dimmed">
                      CEO:
                    </Text>
                    <CharacterAnchor characterId={corporationData.ceo_id}>
                      <CharacterName
                        characterId={corporationData.ceo_id}
                        fz="xs"
                        c="dimmed"
                      />
                    </CharacterAnchor>
                  </Group>
                )}

                {corporationData?.creator_id && (
                  <Group wrap="nowrap" gap="xs" mt={4}>
                    <CharacterAvatar
                      characterId={corporationData.creator_id}
                      size="1rem"
                    />
                    <Text size="xs" c="dimmed">
                      Founder:
                    </Text>
                    <CharacterAnchor characterId={corporationData.creator_id}>
                      <CharacterName
                        characterId={corporationData.creator_id}
                        fz="xs"
                        c="dimmed"
                      />
                    </CharacterAnchor>
                  </Group>
                )}
              </div>
            </Group>
            {headerRightSection}
          </Group>
        </Card.Section>

        <Card.Section p="xs" withBorder>
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Members
              </Text>
              <Skeleton visible={!corporationData} width="auto">
                <Text size="xs">
                  {corporationData?.member_count?.toLocaleString() ?? "N/A"}
                </Text>
              </Skeleton>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Tax rate
              </Text>
              <Skeleton visible={!corporationData} width="auto">
                <Text size="xs">{taxRate ?? "N/A"}</Text>
              </Skeleton>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Shares
              </Text>
              <Skeleton visible={!corporationData} width="auto">
                <Text size="xs">
                  {corporationData?.shares?.toLocaleString() ?? "N/A"}
                </Text>
              </Skeleton>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Founded
              </Text>
              <Skeleton visible={!corporationData} width="auto">
                {corporationData?.date_founded ? (
                  <FormattedDateText
                    date={new Date(corporationData.date_founded)}
                    size="xs"
                  />
                ) : (
                  <Text size="xs">N/A</Text>
                )}
              </Skeleton>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                War eligible
              </Text>
              <Skeleton visible={!corporationData} width="auto">
                <Text size="xs">
                  {corporationData?.war_eligible == null
                    ? "N/A"
                    : corporationData.war_eligible
                      ? "Yes"
                      : "No"}
                </Text>
              </Skeleton>
            </Group>
          </Stack>
        </Card.Section>

        {(description || corporationData?.url) && (
          <Card.Section p="xs" withBorder>
            <Stack gap="xs">
              {description && (
                <Text size="xs" c="dimmed" lineClamp={4}>
                  {description}
                </Text>
              )}
              {corporationData?.url && (
                <Anchor href={corporationData.url} target="_blank" size="xs">
                  <Group gap={4} wrap="nowrap">
                    <IconExternalLink size={14} />
                    <Text size="xs" truncate>
                      {corporationData.url}
                    </Text>
                  </Group>
                </Anchor>
              )}
            </Stack>
          </Card.Section>
        )}
      </Card>
    );
  },
);
CorporationCard.displayName = "CorporationCard";

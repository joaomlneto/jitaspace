"use client";

import type { ReactNode } from "react";
import React, { memo } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Card,
  Flex,
  Group,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import {
  useEsiAllianceInformation,
  useEsiAllianceMemberCorporations,
} from "@jitaspace/hooks";

import { AllianceAnchor, CharacterAnchor, CorporationAnchor } from "../Anchor";
import { AllianceAvatar } from "../Avatar";
import { FormattedDateText } from "../DateText";
import { AllianceName, CharacterName, CorporationName } from "../Text";

interface AllianceCardProps {
  allianceId: string | number;
  headerRightSection?: ReactNode;
}

export const AllianceCard = memo(
  ({ allianceId, headerRightSection }: AllianceCardProps) => {
    const { data: allianceData } = useEsiAllianceInformation(
      Number(allianceId),
    );
    const { data: allianceMemberCorporationsData } =
      useEsiAllianceMemberCorporations(Number(allianceId));

    const alliance = allianceData?.data;
    const memberCorporationIds = allianceMemberCorporationsData?.data ?? [];

    return (
      <Card withBorder radius="md">
        <Card.Section p="xs" withBorder>
          <Group wrap="nowrap" justify="space-between" align="start">
            <Group wrap="nowrap" align="start" style={{ flex: 1 }}>
              <AllianceAvatar allianceId={allianceId} size={96} radius="md" />
              <div>
                <Group gap="xs" wrap="nowrap">
                  <AllianceAnchor allianceId={allianceId}>
                    <AllianceName allianceId={allianceId} fz="lg" fw={500} />
                  </AllianceAnchor>
                  <Badge>{alliance?.ticker ?? "N/A"}</Badge>
                </Group>

                {alliance?.creator_id && (
                  <Group wrap="nowrap" gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">
                      Creator:
                    </Text>
                    <CharacterAnchor characterId={alliance.creator_id}>
                      <CharacterName
                        characterId={alliance.creator_id}
                        fz="xs"
                        c="dimmed"
                      />
                    </CharacterAnchor>
                  </Group>
                )}

                {alliance?.executor_corporation_id && (
                  <Group wrap="nowrap" gap="xs" mt={4}>
                    <Text size="xs" c="dimmed">
                      Executor:
                    </Text>
                    <CorporationAnchor
                      corporationId={alliance.executor_corporation_id}
                    >
                      <CorporationName
                        corporationId={alliance.executor_corporation_id}
                        fz="xs"
                        c="dimmed"
                      />
                    </CorporationAnchor>
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
                Founded
              </Text>
              <Skeleton visible={!alliance} width="auto">
                {alliance?.date_founded ? (
                  <FormattedDateText
                    date={new Date(alliance.date_founded)}
                    size="xs"
                  />
                ) : (
                  <Text size="xs">N/A</Text>
                )}
              </Skeleton>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Member corporations
              </Text>
              <Skeleton
                visible={!allianceMemberCorporationsData?.data}
                width="auto"
              >
                <Text size="xs">
                  {memberCorporationIds.length > 0
                    ? memberCorporationIds.length.toLocaleString()
                    : "N/A"}
                </Text>
              </Skeleton>
            </Group>
            <Group justify="space-between" align="start">
              <Text size="xs" c="dimmed">
                Creator corporation
              </Text>
              <Skeleton visible={!alliance} width="auto">
                {alliance?.creator_corporation_id ? (
                  <CorporationAnchor
                    corporationId={alliance.creator_corporation_id}
                  >
                    <CorporationName
                      corporationId={alliance.creator_corporation_id}
                      fz="xs"
                    />
                  </CorporationAnchor>
                ) : (
                  <Text size="xs">N/A</Text>
                )}
              </Skeleton>
            </Group>
            <Group justify="space-between" align="start">
              <Text size="xs" c="dimmed">
                Creator
              </Text>
              <Skeleton visible={!alliance} width="auto">
                {alliance?.creator_id ? (
                  <CharacterAnchor characterId={alliance.creator_id}>
                    <CharacterName characterId={alliance.creator_id} fz="xs" />
                  </CharacterAnchor>
                ) : (
                  <Text size="xs">N/A</Text>
                )}
              </Skeleton>
            </Group>
            <Group justify="space-between" align="start">
              <Text size="xs" c="dimmed">
                Executor corporation
              </Text>
              <Skeleton visible={!alliance} width="auto">
                {alliance?.executor_corporation_id ? (
                  <CorporationAnchor
                    corporationId={alliance.executor_corporation_id}
                  >
                    <CorporationName
                      corporationId={alliance.executor_corporation_id}
                      fz="xs"
                    />
                  </CorporationAnchor>
                ) : (
                  <Text size="xs">N/A</Text>
                )}
              </Skeleton>
            </Group>
          </Stack>
        </Card.Section>

        <Card.Section p="xs" withBorder>
          <Stack gap="xs">
            {memberCorporationIds.length > 0 && (
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Member corporation list
                </Text>
                <Flex gap="xs" wrap="wrap">
                  {memberCorporationIds.map((corporationId) => (
                    <Badge key={corporationId} variant="light">
                      <CorporationAnchor corporationId={corporationId}>
                        <CorporationName
                          corporationId={corporationId}
                          fz="xs"
                        />
                      </CorporationAnchor>
                    </Badge>
                  ))}
                </Flex>
              </Stack>
            )}

            <Anchor
              component={Link}
              href={`https://evewho.com/alliance/${allianceId}`}
              target="_blank"
              size="xs"
            >
              <Group gap={4} wrap="nowrap">
                <IconExternalLink size={14} />
                <Text size="xs">Open in EVE Who</Text>
              </Group>
            </Anchor>
          </Stack>
        </Card.Section>
      </Card>
    );
  },
);
AllianceCard.displayName = "AllianceCard";

"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { Badge, Flex, Skeleton, Stack, Text } from "@mantine/core";

import type { EntityCardVariant, EntityRef } from "./types";
import { AllianceAvatar } from "../Avatar";
import { DateHoverCard, FormattedDateText } from "../DateText";
import { EntityCard, EntityCardSection } from "./EntityCard";
import {
  entityCardAvatarProps,
  EntityCardTitle,
  EntityLink,
} from "./EntityLink";

export interface AllianceCardData {
  name?: string;
  ticker?: string;
  dateFounded?: Date;
  executorCorporation?: EntityRef;
  creatorCorporation?: EntityRef;
  creator?: EntityRef;
  /**
   * The alliance's corporations, or a sample of them; the card lists at most
   * `MEMBER_CORPORATIONS_SHOWN`. Omit while they load.
   */
  memberCorporations?: EntityRef[];
  /** How many corporations the alliance has, if more than the list holds. */
  memberCorporationCount?: number;
}

/** Large alliances have hundreds of corporations; the card lists this many. */
export const MEMBER_CORPORATIONS_SHOWN = 24;

export interface AllianceCardDisplayProps {
  allianceId: number;
  /** Omit while loading. */
  alliance?: AllianceCardData;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

/** An alliance: ticker, executor, founding, and its member corporations. */
export const AllianceCardDisplay = memo(
  ({
    allianceId,
    alliance,
    variant = "full",
    headerRightSection,
  }: AllianceCardDisplayProps) => {
    const members = alliance?.memberCorporations;
    const memberCount = alliance?.memberCorporationCount ?? members?.length;
    const shown = members?.slice(0, MEMBER_CORPORATIONS_SHOWN) ?? [];
    const hidden = (memberCount ?? 0) - shown.length;
    const executor = alliance?.executorCorporation && (
      <EntityLink
        kind="corporation"
        entity={alliance.executorCorporation}
        c="dimmed"
      />
    );

    return (
      <EntityCard
        variant={variant}
        loading={!alliance}
        avatar={
          <AllianceAvatar
            allianceId={allianceId}
            {...entityCardAvatarProps(variant)}
          />
        }
        title={
          <EntityCardTitle
            kind="alliance"
            entity={{ id: allianceId, name: alliance?.name }}
            variant={variant}
          />
        }
        badges={
          <Skeleton visible={!alliance?.ticker} width="auto">
            <Badge style={{ flexShrink: 0 }}>
              {alliance?.ticker ?? "XXXXX"}
            </Badge>
          </Skeleton>
        }
        subtitle={executor}
        headerRightSection={headerRightSection}
        stats={[
          {
            label: "Founded",
            value: alliance?.dateFounded && (
              <DateHoverCard date={alliance.dateFounded}>
                <FormattedDateText
                  date={alliance.dateFounded}
                  format="yyyy-MM-dd"
                  size="xs"
                />
              </DateHoverCard>
            ),
          },
          {
            label: "Member corporations",
            value: memberCount?.toLocaleString("en-US"),
          },
          {
            label: "Creator corporation",
            value: alliance?.creatorCorporation && (
              <EntityLink
                kind="corporation"
                entity={alliance.creatorCorporation}
              />
            ),
          },
          {
            label: "Creator",
            value: alliance?.creator && (
              <EntityLink kind="character" entity={alliance.creator} />
            ),
          },
        ]}
      >
        {shown.length > 0 && (
          <EntityCardSection>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                Corporations
              </Text>
              <Flex gap="xs" wrap="wrap">
                {shown.map((corporation) => (
                  <Badge
                    key={corporation.id}
                    variant="light"
                    tt="none"
                    maw="100%"
                  >
                    <EntityLink
                      kind="corporation"
                      entity={corporation}
                      withAvatar={false}
                    />
                  </Badge>
                ))}
                {hidden > 0 && (
                  <Text size="xs" c="dimmed">
                    +{hidden.toLocaleString("en-US")} more
                  </Text>
                )}
              </Flex>
            </Stack>
          </EntityCardSection>
        )}
      </EntityCard>
    );
  },
);
AllianceCardDisplay.displayName = "AllianceCardDisplay";

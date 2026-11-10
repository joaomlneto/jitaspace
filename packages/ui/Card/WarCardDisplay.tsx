"use client";

import type { CardProps } from "@mantine/core";
import type { ReactNode } from "react";
import { memo } from "react";
import {
  Badge,
  Box,
  Flex,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";

import type { EntityCardVariant, EntityRef } from "./types";
import { AllianceAvatar, CorporationAvatar } from "../Avatar";
import { DateHoverCard, FormattedDateText } from "../DateText";
import { ISKAmount } from "../Text";
import { EntityCard, EntityCardSection } from "./EntityCard";
import { EntityLink } from "./EntityLink";
import { EntityAnchor } from "./EntityLinks";

/** An alliance or corporation taking part in a war. */
export interface WarParticipant {
  kind: "alliance" | "corporation";
  entity: EntityRef;
}

export type WarParty = WarParticipant & {
  iskDestroyed?: number;
  shipsKilled?: number;
};

/**
 * - `declared`: not started yet (wars start 24 hours after declaration)
 * - `active`: under way with no end date
 * - `ending`: under way, with an end date set (retracted, surrendered…)
 * - `finished`: over
 */
export type WarStatus = "declared" | "active" | "ending" | "finished";

export interface WarCardData {
  aggressor: WarParty;
  defender: WarParty;
  allies?: WarParticipant[];
  declared?: Date;
  started?: Date;
  finished?: Date;
  mutual?: boolean;
  openForAllies?: boolean;
  status?: WarStatus;
}

export interface WarCardDisplayProps {
  warId: number;
  /** Omit while loading. */
  war?: WarCardData;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
  /** Passed to the card frame, e.g. `withBorder={false}` to embed it. */
  cardProps?: Omit<CardProps, "children">;
}

/**
 * A war's status at `now`. A function of its dates rather than something the
 * card works out while rendering, so the caller picks the clock: reading it
 * during a prerender would make the page dynamic.
 */
export const warStatus = (
  war: { started?: Date; finished?: Date },
  now: Date,
): WarStatus => {
  if (war.finished && war.finished <= now) return "finished";
  if (war.started && war.started > now) return "declared";
  if (war.finished) return "ending";
  return "active";
};

const STATUS_BADGE: Record<WarStatus, { label: string; color: string }> = {
  declared: { label: "Declared", color: "yellow" },
  active: { label: "Active", color: "red" },
  ending: { label: "Ending", color: "orange" },
  finished: { label: "Finished", color: "gray" },
};

const ParticipantAvatar = ({
  participant,
  size,
}: {
  participant: WarParticipant;
  size: number;
}) =>
  participant.kind === "alliance" ? (
    <AllianceAvatar allianceId={participant.entity.id} size={size} />
  ) : (
    <CorporationAvatar corporationId={participant.entity.id} size={size} />
  );

const PartyColumn = ({
  side,
  party,
}: {
  side: "Aggressor" | "Defender";
  party: WarParty;
}) => (
  <Stack gap={4} miw={0}>
    <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
      {side}
    </Text>
    <Group gap="xs" wrap="nowrap" miw={0}>
      <ParticipantAvatar participant={party} size={38} />
      <Box miw={0}>
        <EntityLink
          kind={party.kind}
          entity={party.entity}
          withAvatar={false}
          size="sm"
          fw={500}
        />
        <Group gap={6} wrap="nowrap">
          {party.iskDestroyed === undefined ? (
            <Text size="xs">N/A</Text>
          ) : (
            <ISKAmount amount={party.iskDestroyed} size="xs" />
          )}
          <Text size="xs" c="dimmed">
            destroyed
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          {(party.shipsKilled ?? 0).toLocaleString("en-US")} ships killed
        </Text>
      </Box>
    </Group>
  </Stack>
);

const yesNo = (value?: boolean) => {
  if (value === undefined) return undefined;
  return value ? "Yes" : "No";
};

const dateValue = (date?: Date) =>
  date && (
    <DateHoverCard date={date}>
      <FormattedDateText date={date} format="yyyy-MM-dd HH:mm" size="xs" />
    </DateHoverCard>
  );

/** A war: who declared it on whom, its status, losses on each side and allies. */
export const WarCardDisplay = memo(
  ({
    warId,
    war,
    variant = "full",
    headerRightSection,
    cardProps,
  }: WarCardDisplayProps) => {
    const avatarSize = variant === "full" ? 56 : 30;
    const status = war?.status && STATUS_BADGE[war.status];
    const allies = war?.allies ?? [];

    return (
      <EntityCard
        {...cardProps}
        variant={variant}
        loading={!war}
        avatar={
          war ? (
            <Group gap={4} wrap="nowrap">
              <ParticipantAvatar
                participant={war.aggressor}
                size={avatarSize}
              />
              <Text size="xs" c="dimmed">
                vs
              </Text>
              <ParticipantAvatar participant={war.defender} size={avatarSize} />
            </Group>
          ) : (
            <Group gap={4} wrap="nowrap">
              <Skeleton w={avatarSize} h={avatarSize} />
              <Text size="xs" c="dimmed">
                vs
              </Text>
              <Skeleton w={avatarSize} h={avatarSize} />
            </Group>
          )
        }
        title={
          <EntityAnchor
            kind="war"
            id={warId}
            size={variant === "full" ? "lg" : "sm"}
            fw={500}
          >
            War {warId}
          </EntityAnchor>
        }
        badges={
          <>
            {status && (
              <Badge color={status.color} variant="light">
                {status.label}
              </Badge>
            )}
            {variant === "full" && war?.mutual && (
              <Badge color="grape" variant="light">
                Mutual
              </Badge>
            )}
          </>
        }
        subtitle={
          war && (
            <Group gap={6} wrap="nowrap" miw={0}>
              <EntityLink
                kind={war.aggressor.kind}
                entity={war.aggressor.entity}
                withAvatar={false}
                c="dimmed"
              />
              <Text size="xs" c="dimmed">
                vs
              </Text>
              <EntityLink
                kind={war.defender.kind}
                entity={war.defender.entity}
                withAvatar={false}
                c="dimmed"
              />
            </Group>
          )
        }
        headerRightSection={headerRightSection}
        stats={[
          { label: "Declared", value: dateValue(war?.declared) },
          { label: "Started", value: dateValue(war?.started) },
          {
            label: war?.status === "finished" ? "Ended" : "Ends",
            value: dateValue(war?.finished) ?? (war && "Not set"),
          },
          { label: "Open for allies", value: yesNo(war?.openForAllies) },
        ]}
      >
        {war && (
          <EntityCardSection>
            <SimpleGrid cols={2} spacing="sm">
              <PartyColumn side="Aggressor" party={war.aggressor} />
              <PartyColumn side="Defender" party={war.defender} />
            </SimpleGrid>
          </EntityCardSection>
        )}
        {allies.length > 0 && (
          <EntityCardSection>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                Defender&rsquo;s allies ({allies.length.toLocaleString("en-US")}
                )
              </Text>
              <Flex gap="xs" wrap="wrap">
                {allies.map((ally) => (
                  <EntityLink
                    key={ally.entity.id}
                    kind={ally.kind}
                    entity={ally.entity}
                  />
                ))}
              </Flex>
            </Stack>
          </EntityCardSection>
        )}
      </EntityCard>
    );
  },
);
WarCardDisplay.displayName = "WarCardDisplay";

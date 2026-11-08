"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { Anchor, Badge, Group, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { EntityCardVariant, EntityRef } from "./types";
import { TypeAvatar } from "../Avatar";
import { SolarSystemSecurityStatusBadge } from "../Badge";
import { DateHoverCard, FormattedDateText } from "../DateText";
import { ISKAmount } from "../Text";
import { EntityCard, EntityCardSection } from "./EntityCard";
import {
  entityCardAvatarProps,
  EntityCardTitle,
  EntityLink,
} from "./EntityLink";

export interface KillmailParticipant {
  character?: EntityRef;
  corporation?: EntityRef;
  alliance?: EntityRef;
  ship?: EntityRef;
}

export interface KillmailCardData {
  time?: Date;
  victim: KillmailParticipant & { damageTaken?: number };
  finalBlow?: KillmailParticipant;
  attackerCount?: number;
  solarSystem?: EntityRef & { securityStatus?: number };
  /** ISK lost, where a killboard has priced it; ESI does not. */
  value?: number;
}

export interface KillmailCardDisplayProps {
  killmailId: number;
  /** Omit while loading. */
  killmail?: KillmailCardData;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

const KILLBOARDS = [
  { name: "EVE-Kill", url: (id: number) => `https://eve-kill.com/kill/${id}` },
  {
    name: "zKillboard",
    url: (id: number) => `https://zkillboard.com/kill/${id}/`,
  },
];

/** A ship's loss: victim, location, final blow and where to read more. */
export const KillmailCardDisplay = memo(
  ({
    killmailId,
    killmail,
    variant = "full",
    headerRightSection,
  }: KillmailCardDisplayProps) => {
    const victim = killmail?.victim;
    const system = killmail?.solarSystem;

    return (
      <EntityCard
        variant={variant}
        loading={!killmail}
        avatar={
          <TypeAvatar
            typeId={victim?.ship?.id}
            variation="render"
            {...entityCardAvatarProps(variant)}
          />
        }
        title={
          <EntityCardTitle
            kind="killmail"
            entity={{ id: killmailId, name: victim?.ship?.name }}
            variant={variant}
          />
        }
        badges={
          killmail?.attackerCount === 1 && (
            <Badge color="red" variant="light">
              Solo
            </Badge>
          )
        }
        subtitle={
          <>
            <EntityLink
              kind="character"
              entity={victim?.character}
              c="dimmed"
            />
            {variant === "full" && (
              <>
                <EntityLink
                  kind="corporation"
                  entity={victim?.corporation}
                  c="dimmed"
                />
                <EntityLink
                  kind="alliance"
                  entity={victim?.alliance}
                  c="dimmed"
                />
              </>
            )}
            {variant === "compact" && system && (
              <EntityLink
                kind="solar_system"
                entity={system}
                withAvatar={false}
                c="dimmed"
              />
            )}
          </>
        }
        headerRightSection={headerRightSection}
        stats={[
          {
            label: "Time",
            value: killmail?.time && (
              <DateHoverCard date={killmail.time}>
                <FormattedDateText
                  date={killmail.time}
                  format="yyyy-MM-dd HH:mm"
                  size="xs"
                />
              </DateHoverCard>
            ),
          },
          {
            label: "Location",
            value: system && (
              <Group gap={6} wrap="nowrap">
                {system.securityStatus !== undefined && (
                  <SolarSystemSecurityStatusBadge
                    securityStatus={system.securityStatus}
                    size="xs"
                  />
                )}
                <EntityLink
                  kind="solar_system"
                  entity={system}
                  withAvatar={false}
                />
              </Group>
            ),
          },
          {
            label: "Final blow",
            value: killmail?.finalBlow && (
              <EntityLink
                kind={killmail.finalBlow.character ? "character" : "type"}
                entity={killmail.finalBlow.character ?? killmail.finalBlow.ship}
              />
            ),
          },
          {
            label: "Attackers",
            value: killmail?.attackerCount?.toLocaleString("en-US"),
          },
          {
            label: "Damage taken",
            value: victim?.damageTaken?.toLocaleString("en-US"),
          },
          // ESI does not price kills; show the row only when a killboard has.
          ...(killmail?.value === undefined
            ? []
            : [
                {
                  label: "Value",
                  value: <ISKAmount amount={killmail.value} size="xs" />,
                },
              ]),
        ]}
      >
        <EntityCardSection>
          <Group gap="md">
            {KILLBOARDS.map(({ name, url }) => (
              <Anchor
                key={name}
                href={url(killmailId)}
                target="_blank"
                rel="noreferrer"
                size="xs"
              >
                <Group gap={4} wrap="nowrap">
                  <IconExternalLink size={14} />
                  <Text size="xs" span>
                    {name}
                  </Text>
                </Group>
              </Anchor>
            ))}
          </Group>
        </EntityCardSection>
      </EntityCard>
    );
  },
);
KillmailCardDisplay.displayName = "KillmailCardDisplay";

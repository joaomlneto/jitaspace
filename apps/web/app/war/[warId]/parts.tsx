"use client";

import type { ReactNode } from "react";
import {
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
} from "@mantine/core";

import { AllianceName, CorporationName } from "@jitaspace/eve-components";
import {
  AllianceAvatar,
  CorporationAvatar,
  DateHoverCard,
  TimeAgoText,
} from "@jitaspace/ui";

import type { EsiWar, WarParty } from "./sides";
import type { WarKillmailEntry, WarKillmailFeed } from "./useWarKillmailFeed";
import { AllianceAnchor, CorporationAnchor } from "~/components/Anchor";
import {
  AllianceTickerBadge,
  CorporationTickerBadge,
} from "~/components/Badge";
import {
  EsiKillmailCard,
  KillmailLineCard,
  KillmailLineCardHeader,
  KillmailLineCardSkeleton,
} from "~/components/Killmails";
import { formatDateTime, formatInteger } from "~/lib/format";
import { lossTag } from "./sides";

/** A war party's logo, by whichever id it has. */
export function PartyAvatar({
  party,
  size,
  className,
}: Readonly<{
  party: WarParty | undefined;
  size: number;
  className?: string;
}>) {
  if (party?.alliance_id)
    return (
      <AllianceAvatar
        allianceId={party.alliance_id}
        size={size}
        className={className}
      />
    );
  return (
    <CorporationAvatar
      corporationId={party?.corporation_id}
      size={size}
      className={className}
    />
  );
}

/** A war party's linked name. */
export function PartyName({
  party,
  linked = true,
}: Readonly<{ party: WarParty | undefined; linked?: boolean }>) {
  if (!linked && party?.alliance_id)
    return <AllianceName span inherit allianceId={party.alliance_id} />;
  if (!linked && party?.corporation_id)
    return (
      <CorporationName span inherit corporationId={party.corporation_id} />
    );
  if (party?.alliance_id)
    return (
      <AllianceAnchor allianceId={party.alliance_id} inherit>
        <AllianceName span inherit allianceId={party.alliance_id} />
      </AllianceAnchor>
    );
  if (party?.corporation_id)
    return (
      <CorporationAnchor corporationId={party.corporation_id} inherit>
        <CorporationName span inherit corporationId={party.corporation_id} />
      </CorporationAnchor>
    );
  return <span>…</span>;
}

export function PartyTicker({
  party,
}: Readonly<{ party: WarParty | undefined }>) {
  if (party?.alliance_id)
    return <AllianceTickerBadge allianceId={party.alliance_id} size="sm" />;
  if (party?.corporation_id)
    return (
      <CorporationTickerBadge corporationId={party.corporation_id} size="sm" />
    );
  return null;
}

/** A moment of the war: its EVE time, and how long ago (or until) it is. */
export function WarDate({ iso }: Readonly<{ iso: string }>) {
  const date = new Date(iso);
  return (
    <DateHoverCard date={date}>
      <Text span inherit>
        {formatDateTime(iso)}
      </Text>
    </DateHoverCard>
  );
}

interface TimelineStep {
  title: string;
  iso: string;
  description: string;
}

/** Declared → fighting → retracted → over, as far as the war has got. */
export function WarTimeline({
  war,
  now,
}: Readonly<{ war: EsiWar; now: number }>) {
  const steps: TimelineStep[] = [
    {
      title: "Declared",
      iso: war.declared,
      description: war.mutual
        ? "Both sides agreed to fight."
        : "The aggressor declared war.",
    },
  ];
  if (war.started)
    steps.push({
      title: "Fighting",
      iso: war.started,
      description: "Both sides may engage each other anywhere.",
    });
  if (war.retracted)
    steps.push({
      title: "Retracted",
      iso: war.retracted,
      description: "The war was called off; fighting continues until it ends.",
    });
  if (war.finished)
    steps.push({
      title: "Finished",
      iso: war.finished,
      description: "The war is over.",
    });

  const active = steps.filter(
    (step) => new Date(step.iso).getTime() <= now,
  ).length;

  return (
    <Timeline active={active - 1} bulletSize={14} lineWidth={2}>
      {steps.map((step) => {
        const isFuture = new Date(step.iso).getTime() > now;
        return (
          <Timeline.Item key={step.title} title={step.title}>
            <Text size="sm" c={isFuture ? "dimmed" : undefined}>
              <WarDate iso={step.iso} />
              {" · "}
              <TimeAgoText span inherit date={new Date(step.iso)} addSuffix />
            </Text>
            <Text size="xs" c="dimmed">
              {step.description}
            </Text>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}

function KillmailEntry({
  entry,
  war,
  isZkbLoading,
}: Readonly<{
  entry: WarKillmailEntry;
  war: EsiWar | undefined;
  isZkbLoading: boolean;
}>) {
  if (entry.zkb)
    return (
      <KillmailLineCard
        killmail={entry.zkb}
        hash={entry.hash}
        zkb={entry.zkb.zkb}
        tag={lossTag(war, entry.zkb)}
      />
    );
  // zKillboard may still bring this one in full; wait rather than ask ESI.
  if (isZkbLoading) return <KillmailLineCardSkeleton />;
  return (
    <EsiKillmailCard
      killmailId={entry.killmailId}
      killmailHash={entry.hash}
      card={KillmailLineCard}
      skeleton={<KillmailLineCardSkeleton />}
      tagFor={(killmail) => lossTag(war, killmail)}
    />
  );
}

/** A war's killmails as cards, revealed a batch at a time. */
export function KillmailList({
  war,
  feed,
  limit,
  footer,
}: Readonly<{
  war: EsiWar | undefined;
  feed: WarKillmailFeed;
  /** Show only the newest few, with no "load more". */
  limit?: number;
  footer?: ReactNode;
}>) {
  if (feed.isLoading)
    return (
      <Stack gap={4}>
        {Array.from({ length: 3 }, (_, index) => (
          <KillmailLineCardSkeleton key={index} />
        ))}
      </Stack>
    );

  if (feed.entries.length === 0)
    return (
      <Text size="sm" c="dimmed">
        No ships have been destroyed in this war.
      </Text>
    );

  const shown =
    limit === undefined ? feed.visible : feed.entries.slice(0, limit);
  return (
    <Stack gap="xs">
      <Stack gap={4}>
        <KillmailLineCardHeader />
        {shown.map((entry) => (
          <KillmailEntry
            key={entry.killmailId}
            entry={entry}
            war={war}
            isZkbLoading={feed.isZkbLoading}
          />
        ))}
      </Stack>
      {limit === undefined && feed.remaining > 0 && (
        <Button variant="default" fullWidth onClick={feed.showMore}>
          Load more killmails ({formatInteger(feed.remaining)} remaining)
        </Button>
      )}
      {footer}
    </Stack>
  );
}

/** The alliances and corporations that joined the defender. */
export function AlliesGrid({ allies }: Readonly<{ allies: WarParty[] }>) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
      {allies.map((ally) => (
        <Paper
          key={ally.alliance_id ?? ally.corporation_id}
          withBorder
          radius="md"
          p="sm"
        >
          <Group gap="sm" wrap="nowrap">
            <PartyAvatar party={ally} size={40} />
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} truncate>
                <PartyName party={ally} />
              </Text>
              <Group gap={6}>
                <PartyTicker party={ally} />
                <Text size="xs" c="dimmed">
                  {ally.alliance_id ? "Alliance" : "Corporation"}
                </Text>
              </Group>
            </Stack>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

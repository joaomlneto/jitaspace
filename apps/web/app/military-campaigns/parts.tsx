"use client";

import type { ReactNode } from "react";
import { Badge, Stack, Text, Tooltip } from "@mantine/core";
import { formatDistanceStrict } from "date-fns";

import type { CharactersMilitaryCampaignsObjectivesParticipationCharacterobjective } from "@jitaspace/esi-client";
import type { EsiSubjectItem } from "@jitaspace/hooks";

import type { MilitaryCampaignState } from "./esi";

/** One character's part in one objective, tagged with the character's id. */
export type Participation =
  EsiSubjectItem<CharactersMilitaryCampaignsObjectivesParticipationCharacterobjective>;

/** The scope behind a character's campaign participation. */
export const MILITARY_CAMPAIGNS_SCOPE = "esi.activity.char:read";

/**
 * ESI names campaigns and objectives by UUID only, so the page does too — by
 * the first block, which is unique among the handful listed at once.
 */
export const shortId = (uuid: string) => uuid.slice(0, 8);

export const campaignAnchorId = (campaignId: string) =>
  `campaign-${campaignId}`;

const STATE_COLOR: Record<MilitaryCampaignState, string> = {
  Active: "green",
  Completed: "blue",
  Expired: "gray",
  Unspecified: "gray",
};

const STATE_DESCRIPTION: Record<MilitaryCampaignState, string> = {
  Active: "Active and accepting contributions",
  Completed: "Met its target before the end date",
  Expired: "Failed to meet its target before the end date",
  Unspecified: "ESI did not say",
};

/** Active first, then the outcomes. */
export const STATE_ORDER: Record<MilitaryCampaignState, number> = {
  Active: 0,
  Completed: 1,
  Expired: 2,
  Unspecified: 3,
};

export function StateBadge({
  state,
  size = "sm",
}: Readonly<{ state: MilitaryCampaignState; size?: "xs" | "sm" | "md" }>) {
  return (
    <Tooltip label={STATE_DESCRIPTION[state]}>
      <Badge color={STATE_COLOR[state]} variant="light" size={size}>
        {state}
      </Badge>
    </Tooltip>
  );
}

export function Stat({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="lg" fw={500} component="div">
        {children}
      </Text>
    </Stack>
  );
}

/**
 * How long something ran: to its end, or — still running — to `readAt`, the
 * moment the data was read, never the browser's clock (see esi.ts).
 */
export function runDurationMs(
  started: string | null,
  finished: string | null,
  readAt: string,
): number | null {
  if (!started) return null;
  return new Date(finished ?? readAt).getTime() - new Date(started).getTime();
}

export function formatRunDuration(
  started: string | null,
  finished: string | null,
  readAt: string,
): string {
  if (!started) return "—";
  return formatDistanceStrict(new Date(started), new Date(finished ?? readAt));
}

"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Anchor, Badge, Group, Text, Tooltip } from "@mantine/core";
import { IconExternalLink, IconSkull } from "@tabler/icons-react";

import {
  AllianceAvatar,
  DateHoverCard,
  FactionAvatar,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import type {
  IncursionLookups,
  IncursionState,
  SovereigntyHolder,
} from "./types";

export const STATES: { state: IncursionState; label: string; color: string }[] =
  [
    { state: "established", label: "Established", color: "cyan" },
    { state: "mobilizing", label: "Mobilizing", color: "yellow" },
    { state: "withdrawing", label: "Withdrawing", color: "grape" },
  ];
export const STATE_LABEL = Object.fromEntries(
  STATES.map((s) => [s.state, s.label]),
) as Record<IncursionState, string>;
export const STATE_COLOR = Object.fromEntries(
  STATES.map((s) => [s.state, s.color]),
) as Record<IncursionState, string>;
export const STATE_TIMESTAMP = {
  established: "establishedAt",
  mobilizing: "mobilizingAt",
  withdrawing: "withdrawingAt",
} as const;

/** EVE time is UTC: "2026-10-06 16:15". Deterministic, so safe to prerender. */
export const eveTime = (iso: string | number) => {
  const text = typeof iso === "string" ? iso : new Date(iso).toISOString();
  return `${text.slice(0, 10)} ${text.slice(11, 16)}`;
};

export const percent = (influence: number) => `${Math.round(influence * 100)}%`;

const dotlanName = (name: string) =>
  encodeURIComponent(name.replaceAll(" ", "_"));

// A clock shared by every live timer on the page, ticking once a second while
// anything listens. The server snapshot is null, so a prerender and the
// hydration that follows it both use the page's read time instead.
let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();
const subscribeToClock = (listener: () => void) => {
  clockListeners.add(listener);
  clockTimer ??= setInterval(() => {
    clockNow = Date.now();
    for (const notify of clockListeners) notify();
  }, 1000);
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== undefined) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
};
const getClockNow = () => {
  if (clockNow === 0) clockNow = Date.now();
  return clockNow;
};
const getServerClockNow = () => null;

/** "Now", ticking every second once hydrated; `readAt` until then. */
export function useLiveNow(readAt: number): number {
  return (
    useSyncExternalStore(subscribeToClock, getClockNow, getServerClockNow) ??
    readAt
  );
}

export function useNames(data: IncursionLookups) {
  return useMemo(
    () => ({
      constellation: (id: number) =>
        data.constellations[id]?.name ?? `Constellation ${id}`,
      region: (constellationId: number) => {
        const regionId = data.constellations[constellationId]?.regionId;
        return regionId === undefined
          ? undefined
          : { regionId, name: data.regions[regionId] ?? `Region ${regionId}` };
      },
      faction: (id: number) => data.factions[id] ?? `Faction ${id}`,
      alliance: (id: number) => data.alliances[id] ?? `Alliance ${id}`,
      system: (id: number) => data.solarSystems[id],
    }),
    [data],
  );
}
export type Names = ReturnType<typeof useNames>;

export function SystemLink({
  solarSystemId,
  names,
  size = "sm",
}: Readonly<{ solarSystemId: number; names: Names; size?: string }>) {
  const system = names.system(solarSystemId);
  return (
    <Group gap={6} wrap="nowrap" component="span">
      {system && (
        <SolarSystemSecurityStatusBadge
          securityStatus={system.securityStatus}
          size="xs"
          miw="max-content"
        />
      )}
      <Anchor component={Link} href={`/system/${solarSystemId}`} size={size}>
        {system?.name ?? solarSystemId}
      </Anchor>
    </Group>
  );
}

export function ConstellationLink({
  constellationId,
  names,
  size = "sm",
  fw,
}: Readonly<{
  constellationId: number;
  names: Names;
  size?: string;
  fw?: number;
}>) {
  return (
    <Anchor
      component={Link}
      href={`/constellation/${constellationId}`}
      size={size}
      fw={fw}
    >
      {names.constellation(constellationId)}
    </Anchor>
  );
}

/** A link to the constellation's map on DOTLAN EveMaps. */
export function DotlanLink({
  constellationId,
  names,
}: Readonly<{ constellationId: number; names: Names }>) {
  const region = names.region(constellationId);
  if (!region) return null;
  const href = `https://evemaps.dotlan.net/map/${dotlanName(region.name)}/${dotlanName(names.constellation(constellationId))}#radius`;
  return (
    <Tooltip label="Map on DOTLAN EveMaps">
      <Anchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        size="xs"
        c="dimmed"
        aria-label="Map on DOTLAN EveMaps"
      >
        <IconExternalLink size={14} />
      </Anchor>
    </Tooltip>
  );
}

export function StateBadge({
  state,
}: Readonly<{ state: IncursionState | "ended" }>) {
  return (
    <Badge
      variant="light"
      color={state === "ended" ? "red" : STATE_COLOR[state]}
      miw="max-content"
    >
      {state === "ended" ? "Ended" : STATE_LABEL[state]}
    </Badge>
  );
}

/** ESI's `has_boss`: the final encounter's boss is up. */
export function BossBadge() {
  return (
    <Tooltip label="The final encounter's boss has spawned">
      <Badge
        variant="filled"
        color="red"
        miw="max-content"
        leftSection={<IconSkull size={12} />}
      >
        Boss
      </Badge>
    </Tooltip>
  );
}

/** A table cell's EVE time, kept on one line; local time too on hover. */
export function EveTime({ iso }: Readonly<{ iso: string }>) {
  return (
    <DateHoverCard date={new Date(iso)}>
      <Text span size="sm" style={{ whiteSpace: "nowrap" }}>
        {eveTime(iso)}
      </Text>
    </DateHoverCard>
  );
}

/** Who held a system: the alliance if any, otherwise the faction. */
export function SovereigntyHolderLabel({
  holder,
  names,
  withName = true,
  size = "sm",
}: Readonly<{
  holder: SovereigntyHolder | undefined;
  names: Names;
  withName?: boolean;
  size?: "xs" | "sm" | "md";
}>) {
  if (holder?.allianceId != null) {
    const name = names.alliance(holder.allianceId);
    return (
      <Tooltip label={`Sovereignty: ${name}`} disabled={withName}>
        <Group gap={6} wrap="nowrap" component="span">
          <AllianceAvatar
            allianceId={holder.allianceId}
            size={size}
            radius={4}
          />
          {withName && (
            <Anchor
              component={Link}
              href={`/alliance/${holder.allianceId}`}
              size="sm"
            >
              {name}
            </Anchor>
          )}
        </Group>
      </Tooltip>
    );
  }
  if (holder?.factionId != null) {
    const name = names.faction(holder.factionId);
    return (
      <Tooltip label={`Sovereignty: ${name}`} disabled={withName}>
        <Group gap={6} wrap="nowrap" component="span">
          <FactionAvatar factionId={holder.factionId} size={size} radius={4} />
          {withName && (
            <Anchor
              component={Link}
              href={`/faction/${holder.factionId}`}
              size="sm"
            >
              {name}
            </Anchor>
          )}
        </Group>
      </Tooltip>
    );
  }
  return withName ? (
    <Text span size="sm" c="dimmed">
      —
    </Text>
  ) : null;
}

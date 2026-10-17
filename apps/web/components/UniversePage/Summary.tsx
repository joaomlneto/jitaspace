"use client";

import type { ReactNode } from "react";
import { Badge, SimpleGrid } from "@mantine/core";

import { IncursionsIcon } from "@jitaspace/eve-icons";

import type { UniverseIncursion, UniverseSystem } from "./types";
import { STATE_COLOR, STATE_LABEL } from "~/app/incursions/parts";
import { HeroStat, StatCard } from "~/components/EntityPage";
import { formatInteger } from "~/lib/format";
import { bandCounts, formatWormholeClass, SecurityRange } from "./parts";

const stationCount = (systems: readonly UniverseSystem[]) =>
  systems.reduce((sum, system) => sum + system.stationCount, 0);

/**
 * The incursions running here, as a badge beside the page title that opens
 * the Incursions tab. One names its state; several are counted.
 */
export function ActiveIncursionBadge({
  active,
  onClick,
}: Readonly<{
  active: readonly UniverseIncursion[];
  onClick: () => void;
}>) {
  const [first] = active;
  if (!first) return null;
  return (
    <Badge
      component="button"
      type="button"
      variant="light"
      color={STATE_COLOR[first.state]}
      leftSection={<IncursionsIcon size={14} alt="" />}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {active.length === 1
        ? `Incursion: ${STATE_LABEL[first.state]}`
        : `${active.length} incursions`}
    </Badge>
  );
}

/** The figures under the page title: systems, security, stations, incursions. */
export function UniverseHeroStats({
  systems,
  incursionCount,
  children,
}: Readonly<{
  systems: readonly UniverseSystem[];
  incursionCount: number;
  /** Figures to show first. */
  children?: ReactNode;
}>) {
  return (
    <>
      {children}
      <HeroStat label="Systems" value={formatInteger(systems.length)} />
      <HeroStat label="Security" value={<SecurityRange systems={systems} />} />
      <HeroStat label="Stations" value={formatInteger(stationCount(systems))} />
      {incursionCount > 0 && (
        <HeroStat label="Incursions" value={formatInteger(incursionCount)} />
      )}
    </>
  );
}

/**
 * The Overview tab's figures. In wormhole space the last card is the wormhole
 * class; elsewhere it counts the neighbours a stargate away.
 */
export function UniverseFigures({
  systems,
  isWormhole,
  wormholeClassId,
  neighbourCount,
  neighbourLabel,
  children,
}: Readonly<{
  systems: readonly UniverseSystem[];
  isWormhole: boolean;
  wormholeClassId: number | null;
  neighbourCount: number;
  neighbourLabel: string;
  /** Cards to show first. */
  children?: ReactNode;
}>) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
      {children}
      <StatCard
        label="Solar systems"
        value={formatInteger(systems.length)}
        sub={bandCounts(systems, isWormhole)}
      />
      <StatCard label="Security" value={<SecurityRange systems={systems} />} />
      <StatCard label="Stations" value={formatInteger(stationCount(systems))} />
      {isWormhole && wormholeClassId !== null ? (
        <StatCard
          label="Wormhole class"
          value={formatWormholeClass(wormholeClassId)}
        />
      ) : (
        <StatCard
          label={neighbourLabel}
          value={formatInteger(neighbourCount)}
        />
      )}
    </SimpleGrid>
  );
}

import { useQuery } from "@tanstack/react-query";

/**
 * zKillboard's statistics for an alliance or corporation
 * (`/api/stats/{allianceID|corporationID}/{id}/`),
 * read in the browser: the API sends `Access-Control-Allow-Origin: *`. Only
 * the fields the page shows are typed, and all of them are optional: an
 * entity zKillboard has never seen comes back nearly empty.
 */

export interface ZkbMetrics {
  shipsDestroyed?: number;
  shipsLost?: number;
  iskDestroyed?: number;
  iskLost?: number;
  pointsDestroyed?: number;
  pointsLost?: number;
}

export interface ZkbTopEntry {
  kills: number;
  isk?: number;
  characterID?: number;
  corporationID?: number;
  allianceID?: number;
  factionID?: number;
  shipTypeID?: number;
  solarSystemID?: number;
}

export interface ZkbStats extends ZkbMetrics {
  soloKills?: number;
  soloLosses?: number;
  dangerRatio?: number;
  gangRatio?: number;
  avgGangSize?: number;
  topAllTime?: { type: string; data?: ZkbTopEntry[] }[];
  groups?: Record<string, ZkbMetrics & { groupID: number }>;
  months?: Record<string, ZkbMetrics & { year: number; month: number }>;
  labels?: Record<string, ZkbMetrics>;
  /** Kills by UTC weekday ("0" = Sunday) then hour, plus the busiest cell. */
  activity?: Record<string, unknown>;
  rankings?: {
    alltime?: { all?: { ranks?: { overall?: number } } };
  };
}

/** Whose statistics: the entity kind as zKillboard's URLs name it. */
export interface ZkbEntity {
  kind: "alliance" | "corporation";
  id: number;
}

export const zkillboardStatsUrl = ({ kind, id }: ZkbEntity) =>
  `https://zkillboard.com/api/stats/${kind}ID/${id}/`;

export function useZkillboardStats(entity: ZkbEntity) {
  return useQuery<ZkbStats | null>({
    queryKey: ["zkillboard-stats", `${entity.kind}ID`, entity.id],
    queryFn: async ({ signal }) => {
      const res = await fetch(zkillboardStatsUrl(entity), {
        signal,
      });
      if (!res.ok) throw new Error(`zKillboard responded ${res.status}`);
      const body: unknown = await res.json();
      // An unknown id answers with an empty array rather than an object.
      return body !== null && typeof body === "object" && !Array.isArray(body)
        ? body
        : null;
    },
    // zKillboard recomputes these at most every few minutes; an hour is plenty
    // for a page view, and keeps tab switches from refetching ~100 kB.
    staleTime: 60 * 60 * 1000,
    retry: 1,
    enabled: entity.id > 0,
  });
}

/** Share of ISK destroyed out of ISK destroyed + lost, or null with neither. */
export function iskEfficiency(
  destroyed: number | undefined,
  lost: number | undefined,
): number | null {
  const total = (destroyed ?? 0) + (lost ?? 0);
  return total > 0 ? (destroyed ?? 0) / total : null;
}

export interface ZkbMonthRow {
  /** `YYYY-MM`. */
  month: string;
  kills: number;
  losses: number;
  iskDestroyed: number;
  iskLost: number;
}

/** The latest `count` months zKillboard has, oldest first. */
export function recentMonths(
  months: ZkbStats["months"],
  count: number,
): ZkbMonthRow[] {
  return Object.values(months ?? {})
    .map((month) => ({
      month: `${month.year}-${String(month.month).padStart(2, "0")}`,
      kills: month.shipsDestroyed ?? 0,
      losses: month.shipsLost ?? 0,
      iskDestroyed: month.iskDestroyed ?? 0,
      iskLost: month.iskLost ?? 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-count);
}

export interface ZkbLabelRow {
  key: string;
  label: string;
  kills: number;
  losses: number;
}

const LOCATION_LABELS: [string, string][] = [
  ["loc:highsec", "High-sec"],
  ["loc:lowsec", "Low-sec"],
  ["loc:nullsec", "Null-sec"],
  ["loc:w-space", "Wormhole space"],
  ["loc:pochven", "Pochven"],
  ["loc:abyssal", "Abyssal"],
  ["loc:drifter", "Drifter space"],
];

const TIMEZONE_LABELS: [string, string][] = [
  ["tz:eu", "EU"],
  ["tz:ru", "RU"],
  ["tz:use", "US East"],
  ["tz:usw", "US West"],
  ["tz:au", "AU"],
];

function labelRows(
  labels: ZkbStats["labels"],
  keys: [string, string][],
): ZkbLabelRow[] {
  return keys.flatMap(([key, label]) => {
    const metrics = labels?.[key];
    const kills = metrics?.shipsDestroyed ?? 0;
    const losses = metrics?.shipsLost ?? 0;
    return kills + losses > 0 ? [{ key, label, kills, losses }] : [];
  });
}

/** Where in New Eden the entity kills and dies. */
export const locationBreakdown = (labels: ZkbStats["labels"]) =>
  labelRows(labels, LOCATION_LABELS);

/** When (by zKillboard's timezone buckets) the entity kills and dies. */
export const timezoneBreakdown = (labels: ZkbStats["labels"]) =>
  labelRows(labels, TIMEZONE_LABELS);

/**
 * Kills per UTC weekday (rows, Sunday first) and hour (columns), and the
 * busiest cell — or null when there is no recent activity at all.
 */
export function activityGrid(
  activity: ZkbStats["activity"],
): { cells: number[][]; max: number } | null {
  const cells = Array.from({ length: 7 }, (_, day) => {
    const hours = activity?.[String(day)];
    return Array.from({ length: 24 }, (_, hour) => {
      const value =
        hours !== null && typeof hours === "object"
          ? (hours as Record<string, unknown>)[String(hour)]
          : undefined;
      return typeof value === "number" ? value : 0;
    });
  });
  const max = Math.max(...cells.flat());
  return max > 0 ? { cells, max } : null;
}

export interface ZkbGroupRow {
  groupId: number;
  kills: number;
  losses: number;
  iskDestroyed: number;
  iskLost: number;
}

/** Ship groups by ships destroyed plus lost, busiest first. */
export function topGroups(
  groups: ZkbStats["groups"],
  count: number,
): ZkbGroupRow[] {
  return Object.values(groups ?? {})
    .map((group) => ({
      groupId: group.groupID,
      kills: group.shipsDestroyed ?? 0,
      losses: group.shipsLost ?? 0,
      iskDestroyed: group.iskDestroyed ?? 0,
      iskLost: group.iskLost ?? 0,
    }))
    .sort((a, b) => b.kills + b.losses - (a.kills + a.losses))
    .slice(0, count);
}

/** One of zKillboard's all-time top lists, by its `type`. */
export const topAllTime = (stats: ZkbStats | null | undefined, type: string) =>
  stats?.topAllTime?.find((list) => list.type === type)?.data ?? [];

import type {
  CharacterColony,
  ColonyLayout,
  ColonyPin,
  EsiSubjectItem,
} from "@jitaspace/hooks";

import type { PiCatalog, PinKind, PiSchematic } from "./catalog";
import { perHour, pinKindOf, pinSchematicId } from "./catalog";

/** How close to its end an extractor program counts as "expiring soon". */
export const EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;

/**
 * An extractor's program: running, ending within {@link EXPIRING_SOON_MS},
 * ended, or never started (no expiry, so nothing installed).
 */
export const EXTRACTOR_STATUSES = [
  "expired",
  "expiring",
  "running",
  "idle",
] as const;
export type ExtractorStatus = (typeof EXTRACTOR_STATUSES)[number];

/** A colony's status is its most urgent extractor's, or "none" without one. */
export const COLONY_STATUSES = [...EXTRACTOR_STATUSES, "none"] as const;
export type ColonyStatus = (typeof COLONY_STATUSES)[number];

export const COLONY_STATUS_LABELS: Record<ColonyStatus, string> = {
  expired: "Expired",
  expiring: "Expiring soon",
  running: "Running",
  idle: "Idle",
  none: "No extractors",
};

export const COLONY_STATUS_COLORS: Record<ColonyStatus, string> = {
  expired: "red",
  expiring: "orange",
  running: "teal",
  idle: "gray",
  none: "blue",
};

/** Most urgent first, so a colony takes its first extractor status in this order. */
const STATUS_URGENCY: Record<ColonyStatus, number> = {
  expired: 0,
  expiring: 1,
  idle: 2,
  running: 3,
  none: 4,
};

export const compareColonyStatus = (a: ColonyStatus, b: ColonyStatus) =>
  STATUS_URGENCY[a] - STATUS_URGENCY[b];

const parseTime = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
};

export function extractorStatus(
  expiryTime: number | undefined,
  now: number,
): ExtractorStatus {
  if (expiryTime === undefined) return "idle";
  if (expiryTime <= now) return "expired";
  if (expiryTime - now <= EXPIRING_SOON_MS) return "expiring";
  return "running";
}

export interface ExtractorInfo {
  pinId: number;
  typeId: number;
  productTypeId?: number;
  /** ESI's quantity per cycle: the program's starting yield, not its average. */
  qtyPerCycle?: number;
  /** Seconds. */
  cycleTime?: number;
  headCount: number;
  installTime?: number;
  expiryTime?: number;
  status: ExtractorStatus;
  /** Units per hour at {@link qtyPerCycle}. */
  perHour: number;
  /**
   * How far through its program the extractor is, from 0 to 1. Undefined
   * without both ends of the program.
   */
  progress?: number;
}

export interface FactoryInfo {
  pinId: number;
  typeId: number;
  schematicId?: number;
  schematic?: PiSchematic;
  /** Units per hour of the schematic's output, if kept supplied. */
  outputPerHour: number;
  lastCycleStart?: number;
}

export interface StoredItem {
  typeId: number;
  amount: number;
}

export interface ColonySummary {
  extractors: ExtractorInfo[];
  factories: FactoryInfo[];
  /** Everything held in the colony's pins, summed per commodity. */
  storage: StoredItem[];
  pinCounts: Record<PinKind, number>;
  status: ColonyStatus;
  /** The soonest end of a program that has not ended yet. */
  nextExpiry?: number;
}

function summarizeExtractor(pin: ColonyPin, now: number): ExtractorInfo {
  const details = pin.extractor_details;
  const installTime = parseTime(pin.install_time);
  const expiryTime = parseTime(pin.expiry_time);
  const progress =
    installTime !== undefined &&
    expiryTime !== undefined &&
    expiryTime > installTime
      ? Math.min(
          1,
          Math.max(0, (now - installTime) / (expiryTime - installTime)),
        )
      : undefined;
  return {
    pinId: pin.pin_id,
    typeId: pin.type_id,
    productTypeId: details?.product_type_id,
    qtyPerCycle: details?.qty_per_cycle,
    cycleTime: details?.cycle_time,
    headCount: details?.heads.length ?? 0,
    installTime,
    expiryTime,
    status: extractorStatus(expiryTime, now),
    perHour:
      details?.qty_per_cycle !== undefined && details.cycle_time !== undefined
        ? perHour(details.qty_per_cycle, details.cycle_time)
        : 0,
    progress,
  };
}

/** Everything the page shows about one colony, derived from its layout. */
export function summarizeColony(
  layout: ColonyLayout,
  catalog: PiCatalog,
  now: number,
): ColonySummary {
  const schematics = new Map(
    catalog.schematics.map((schematic) => [schematic.schematicId, schematic]),
  );
  const pinCounts = Object.fromEntries(
    (
      [
        "command_center",
        "extractor",
        "processor",
        "storage",
        "launchpad",
        "other",
      ] as const
    ).map((kind) => [kind, 0]),
  ) as Record<PinKind, number>;
  const extractors: ExtractorInfo[] = [];
  const factories: FactoryInfo[] = [];
  const stored = new Map<number, number>();

  for (const pin of layout.pins) {
    const kind = pinKindOf(pin, catalog.types);
    pinCounts[kind] += 1;
    if (kind === "extractor") extractors.push(summarizeExtractor(pin, now));
    if (kind === "processor") {
      const schematicId = pinSchematicId(pin);
      const schematic =
        schematicId === undefined ? undefined : schematics.get(schematicId);
      factories.push({
        pinId: pin.pin_id,
        typeId: pin.type_id,
        schematicId,
        schematic,
        outputPerHour: schematic?.output
          ? perHour(schematic.output.quantity, schematic.cycleTime)
          : 0,
        lastCycleStart: parseTime(pin.last_cycle_start),
      });
    }
    // A processor's contents are inputs waiting for its next cycle, not stock.
    if (kind !== "processor") {
      for (const item of pin.contents ?? []) {
        stored.set(item.type_id, (stored.get(item.type_id) ?? 0) + item.amount);
      }
    }
  }

  const status: ColonyStatus = extractors.reduce<ColonyStatus>(
    (worst, extractor) =>
      compareColonyStatus(extractor.status, worst) < 0
        ? extractor.status
        : worst,
    "none",
  );
  const upcoming = extractors
    .map((extractor) => extractor.expiryTime)
    .filter((time): time is number => time !== undefined && time > now);

  return {
    extractors,
    factories,
    storage: [...stored]
      .map(([typeId, amount]) => ({ typeId, amount }))
      .sort((a, b) => b.amount - a.amount),
    pinCounts,
    status,
    nextExpiry: upcoming.length > 0 ? Math.min(...upcoming) : undefined,
  };
}

/** A colony as the page lists it. */
export type ColonyRow = EsiSubjectItem<CharacterColony> & {
  key: string;
  /** Undefined while the layout is loading, or if it failed. */
  summary?: ColonySummary;
  layoutState: "loading" | "ready" | "error";
};

export const colonyRowKey = (characterId: number, planetId: number) =>
  `${characterId}:${planetId}`;

/** Parse a {@link colonyRowKey}, for a key read back from the URL. */
export function parseColonyRowKey(
  key: string | null | undefined,
): { characterId: number; planetId: number } | null {
  const match = /^(\d+):(\d+)$/.exec(key ?? "");
  if (!match) return null;
  return { characterId: Number(match[1]), planetId: Number(match[2]) };
}

export function toColonyRows(
  colonies: readonly EsiSubjectItem<CharacterColony>[],
  layouts: Record<string, ColonyLayout>,
  failedKeys: ReadonlySet<string>,
  catalog: PiCatalog,
  now: number | null,
): ColonyRow[] {
  return colonies.map((colony) => {
    const key = colonyRowKey(colony.subjectId, colony.planet_id);
    const layout = layouts[key];
    return {
      ...colony,
      key,
      // Without a clock (before hydration) there is nothing to say about
      // expiry yet, so the row keeps loading rather than guessing.
      summary:
        layout && now !== null
          ? summarizeColony(layout, catalog, now)
          : undefined,
      layoutState:
        layout && now !== null
          ? "ready"
          : failedKeys.has(key)
            ? "error"
            : "loading",
    };
  });
}

/** An extractor, with the colony it belongs to. */
export type ExtractorRow = ExtractorInfo & {
  key: string;
  colonyKey: string;
  characterId: number;
  planetId: number;
  planetType: CharacterColony["planet_type"];
  solarSystemId: number;
};

export function toExtractorRows(rows: readonly ColonyRow[]): ExtractorRow[] {
  return rows.flatMap((row) =>
    (row.summary?.extractors ?? []).map((extractor) => ({
      ...extractor,
      key: `${row.key}:${extractor.pinId}`,
      colonyKey: row.key,
      characterId: row.subjectId,
      planetId: row.planet_id,
      planetType: row.planet_type,
      solarSystemId: row.solar_system_id,
    })),
  );
}

/** One commodity's flow across the colonies shown. */
export interface ProductionRow {
  typeId: number;
  tier: number | null;
  /** Units per hour pulled out of the ground. */
  extractedPerHour: number;
  /** Units per hour made by processors. */
  producedPerHour: number;
  /** Units per hour processors use as input. */
  consumedPerHour: number;
  /** What is left over per hour: the surplus to export, or a shortfall. */
  netPerHour: number;
  /** How many colonies touch it. */
  colonies: number;
}

/**
 * Hourly flows per commodity, assuming every running extractor keeps its
 * starting yield and every processor stays supplied. Expired extractors
 * produce nothing.
 */
export function aggregateProduction(
  rows: readonly ColonyRow[],
  catalog: PiCatalog,
): ProductionRow[] {
  const flows = new Map<
    number,
    Omit<ProductionRow, "netPerHour" | "tier" | "colonies"> & {
      colonyKeys: Set<string>;
    }
  >();
  const flow = (typeId: number, colonyKey: string) => {
    let entry = flows.get(typeId);
    if (!entry) {
      entry = {
        typeId,
        extractedPerHour: 0,
        producedPerHour: 0,
        consumedPerHour: 0,
        colonyKeys: new Set(),
      };
      flows.set(typeId, entry);
    }
    entry.colonyKeys.add(colonyKey);
    return entry;
  };

  for (const row of rows) {
    for (const extractor of row.summary?.extractors ?? []) {
      if (extractor.productTypeId === undefined) continue;
      if (extractor.status === "expired" || extractor.status === "idle") {
        continue;
      }
      flow(extractor.productTypeId, row.key).extractedPerHour +=
        extractor.perHour;
    }
    for (const factory of row.summary?.factories ?? []) {
      const schematic = factory.schematic;
      if (!schematic?.output) continue;
      flow(schematic.output.typeId, row.key).producedPerHour +=
        factory.outputPerHour;
      for (const input of schematic.inputs) {
        flow(input.typeId, row.key).consumedPerHour += perHour(
          input.quantity,
          schematic.cycleTime,
        );
      }
    }
  }

  return [...flows.values()]
    .map(({ colonyKeys, ...entry }) => ({
      ...entry,
      tier: catalog.types[entry.typeId]?.tier ?? null,
      netPerHour:
        entry.extractedPerHour + entry.producedPerHour - entry.consumedPerHour,
      colonies: colonyKeys.size,
    }))
    .sort((a, b) => b.netPerHour - a.netPerHour);
}

/** A commodity held somewhere, with the colony holding it. */
export interface StorageRow {
  key: string;
  colonyKey: string;
  characterId: number;
  planetId: number;
  solarSystemId: number;
  typeId: number;
  amount: number;
  tier: number | null;
}

export function toStorageRows(
  rows: readonly ColonyRow[],
  catalog: PiCatalog,
): StorageRow[] {
  return rows.flatMap((row) =>
    (row.summary?.storage ?? []).map((item) => ({
      key: `${row.key}:${item.typeId}`,
      colonyKey: row.key,
      characterId: row.subjectId,
      planetId: row.planet_id,
      solarSystemId: row.solar_system_id,
      typeId: item.typeId,
      amount: item.amount,
      tier: catalog.types[item.typeId]?.tier ?? null,
    })),
  );
}

/** Headline numbers for the colonies shown. */
export interface ColonyTotals {
  colonies: number;
  characters: number;
  extractors: number;
  byStatus: Record<ExtractorStatus, number>;
  factories: number;
  nextExpiry?: number;
}

export function colonyTotals(rows: readonly ColonyRow[]): ColonyTotals {
  const byStatus: Record<ExtractorStatus, number> = {
    expired: 0,
    expiring: 0,
    running: 0,
    idle: 0,
  };
  let extractors = 0;
  let factories = 0;
  let nextExpiry: number | undefined;
  for (const row of rows) {
    for (const extractor of row.summary?.extractors ?? []) {
      extractors += 1;
      byStatus[extractor.status] += 1;
    }
    factories += row.summary?.factories.length ?? 0;
    const expiry = row.summary?.nextExpiry;
    if (
      expiry !== undefined &&
      (nextExpiry === undefined || expiry < nextExpiry)
    ) {
      nextExpiry = expiry;
    }
  }
  return {
    colonies: rows.length,
    characters: new Set(rows.map((row) => row.subjectId)).size,
    extractors,
    byStatus,
    factories,
    nextExpiry,
  };
}

/** "2d 4h", "3h 12m", "45m": short enough for a table cell. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Relative to now: "in 3h 12m" or "2d 4h ago". */
export function formatRelative(time: number, now: number): string {
  return time >= now
    ? `in ${formatDuration(time - now)}`
    : `${formatDuration(now - time)} ago`;
}

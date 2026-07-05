import type { WarRoomWar, WarStatus } from "./types";

/** Compact ISK formatter mirroring the shared <ISKAmount> component's scale. */
export function formatIskCompact(amount: number): string {
  const lookup = [
    { value: 1e12, symbol: "T" },
    { value: 1e9, symbol: "B" },
    { value: 1e6, symbol: "M" },
    { value: 1e3, symbol: "K" },
  ];
  const abs = Math.abs(amount);
  const item = lookup.find((entry) => abs >= entry.value);
  if (!item) return Math.round(amount).toString();
  const rx = /\.0+$|(\.\d*[1-9])0+$/;
  return (amount / item.value).toFixed(1).replace(rx, "$1") + item.symbol;
}

export function formatCompactNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

/** Human "12d 4h" / "9h" duration from a fractional number of days. */
export function formatDuration(days: number): string {
  if (days <= 0) return "—";
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return `${hours}h`;
  }
  const whole = Math.floor(days);
  const hours = Math.round((days - whole) * 24);
  return hours > 0 ? `${whole}d ${hours}h` : `${whole}d`;
}

/** Plain-English lifecycle labels. */
export const STATUS_LABEL: Record<WarStatus, string> = {
  pending: "Starting",
  active: "Active",
  retracting: "Ending",
};

/** The side dealing more damage, or null when nothing has died / it's even. */
export function leadingSide(war: WarRoomWar): "aggressor" | "defender" | null {
  if (war.aggressorIskShare === null) return null;
  if (war.aggressorIskDestroyed === war.defenderIskDestroyed) return null;
  return war.aggressorIskShare > 0.5 ? "aggressor" : "defender";
}

export function allyCount(war: WarRoomWar): number {
  return war.allianceAllies.length + war.corporationAllies.length;
}

export function warHasCombat(war: WarRoomWar): boolean {
  return war.totalShipsKilled > 0 || war.totalIskDestroyed > 0;
}

/* ---- Filtering ---- */

export type StatusFilter = "all" | "active" | "starting" | "ending";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "starting", label: "Starting" },
  { value: "ending", label: "Ending" },
];

export interface WarFilters {
  status: StatusFilter;
  combat: boolean;
  mutual: boolean;
  open: boolean;
}

function matchesStatus(war: WarRoomWar, filter: StatusFilter): boolean {
  switch (filter) {
    case "active":
      return war.status === "active";
    case "starting":
      return war.status === "pending";
    case "ending":
      return war.status === "retracting";
    default:
      return true;
  }
}

export function filterWars(wars: WarRoomWar[], f: WarFilters): WarRoomWar[] {
  return wars.filter(
    (war) =>
      matchesStatus(war, f.status) &&
      (!f.combat || warHasCombat(war)) &&
      (!f.mutual || war.isMutual) &&
      (!f.open || war.isOpenForAllies),
  );
}

/* ---- Sorting (shared by the dropdown and the table headers) ---- */

export type SortKey = "isk" | "ships" | "newest" | "longest" | "allies";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "isk", label: "ISK destroyed" },
  { value: "ships", label: "Ships killed" },
  { value: "newest", label: "Newest" },
  { value: "longest", label: "Longest running" },
  { value: "allies", label: "Most allies" },
];

function sortValue(war: WarRoomWar, key: SortKey): number {
  switch (key) {
    case "ships":
      return war.totalShipsKilled;
    case "newest":
      return new Date(war.declaredDate).getTime();
    case "longest":
      return war.ageDays;
    case "allies":
      return allyCount(war);
    case "isk":
    default:
      return war.totalIskDestroyed;
  }
}

/** dir = -1 → high/new first (default); dir = 1 → reversed. */
export function sortWars(
  wars: WarRoomWar[],
  key: SortKey,
  dir: -1 | 1 = -1,
): WarRoomWar[] {
  const flip = dir === -1 ? 1 : -1;
  return [...wars].sort(
    (a, b) =>
      (sortValue(b, key) - sortValue(a, key)) * flip ||
      b.totalIskDestroyed - a.totalIskDestroyed,
  );
}

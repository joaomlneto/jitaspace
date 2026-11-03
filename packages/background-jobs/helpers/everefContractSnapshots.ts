/**
 * Reading EVE Ref's public-contract snapshots
 * (https://data.everef.net/public-contracts/history/): the CSV files of one
 * extracted snapshot, turned into the shapes the shared contract writers take
 * (Contract rows, ESI-shaped items and mutated items, region listings keyed by
 * ESI's Last-Modified). Used by `scripts/ingest-everef-contracts.ts`; kept free
 * of Prisma so it can be unit-tested directly.
 */
import fs from "node:fs";
import path from "node:path";

import type { RegionListing } from "./contractTimelineStore";
import type { ContractRow } from "./publicContracts";
import type { ContractItemRow, DynamicItemData } from "./publicContractsDb";
import { contractTypeOf } from "./publicContracts";

export type Row = Record<string, string>;
/** RFC 4180-ish CSV (quoted fields, doubled quotes, CRLF), as EVE Ref writes it. */
export const parseCsv = (text: string): Row[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  const endField = () => {
    row.push(cur);
    cur = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      // A doubled quote is a literal one; a single one closes the field.
      if (ch !== '"') cur += ch;
      else if (text[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") endField();
    else if (ch === "\n") endRow();
    else if (ch !== "\r") cur += ch;
  }
  if (cur !== "" || row.length) endRow();
  const [header, ...data] = rows;
  if (!header) return [];
  return data
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, k) => [h, r[k] ?? ""])));
};

/**
 * meta.json's scrape_start: an ISO string until late Oct 2022, then epoch
 * seconds. Null when unreadable, so the index's file_time is used.
 */
export const parseScrapeTime = (v: unknown) => {
  let ms = Number.NaN;
  if (
    typeof v === "number" ||
    (typeof v === "string" && /^\d+(\.\d+)?$/.test(v))
  ) {
    ms = Number(v) * 1000;
  } else if (typeof v === "string") {
    ms = Date.parse(v);
  }
  return Number.isFinite(ms) ? ms : null;
};

export interface SnapshotData {
  scrapeStart: number | null;
  contracts: Row[];
  items: Row[];
  bids: Row[];
  dynamic: Row[];
  dynAttrs: Row[];
  dynEffects: Row[];
}

export const readSnapshotDir = (dir: string): SnapshotData => {
  const read = (f: string) =>
    fs.existsSync(path.join(dir, f))
      ? parseCsv(fs.readFileSync(path.join(dir, f), "utf8"))
      : [];
  const meta = fs.existsSync(path.join(dir, "meta.json"))
    ? (JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")) as {
        scrape_start?: unknown;
      })
    : {};
  return {
    scrapeStart: parseScrapeTime(meta.scrape_start),
    contracts: read("contracts.csv"),
    items: read("contract_items.csv"),
    bids: read("contract_bids.csv"),
    dynamic: read("contract_dynamic_items.csv"),
    dynAttrs: read("contract_dynamic_items_dogma_attributes.csv"),
    dynEffects: read("contract_dynamic_items_dogma_effects.csv"),
  };
};

const int = (v: string | undefined) =>
  v === undefined || v === "" ? null : Math.trunc(Number(v));
const num = (v: string | undefined) =>
  v === undefined || v === "" ? null : Number(v);
const bool = (v: string | undefined) =>
  v === undefined || v === "" ? undefined : v === "true";
/**
 * NPC station ID, or null. Structures belong in start_location_id; one
 * off-schedule snapshot (2023-04-12 03:38:06) also put structure IDs (~1e12)
 * in station_id, which overflows the int column.
 */
const npcStationOf = (c: Row) => {
  const s = int(c.station_id);
  return s != null && s <= 2_147_483_647 ? s : null;
};
const ESI_TYPE: Record<string, string> = {
  item_exchange: "item_exchange",
  auction: "auction",
  courier: "courier",
  loan: "loan",
};

/** A Contract row from a snapshot's contracts.csv, as the predecessor stored it. */
export const contractRowFromSnapshot = (c: Row): ContractRow => {
  const big = (v: string | undefined) =>
    v === undefined || v === "" ? null : BigInt(v);
  return {
    contractId: Number(c.contract_id),
    type: contractTypeOf({
      type: (ESI_TYPE[c.type ?? ""] ?? "unknown") as "unknown",
    }),
    issuerId: Number(c.issuer_id),
    issuerCorporationId: Number(c.issuer_corporation_id),
    forCorporation: c.for_corporation === "true",
    title: c.title ?? "",
    dateIssued: new Date(c.date_issued ?? ""),
    dateExpired: new Date(c.date_expired ?? ""),
    daysToComplete: int(c.days_to_complete),
    volume: num(c.volume),
    startLocationId: big(c.start_location_id),
    endLocationId: big(c.end_location_id),
    regionId: Number(c.region_id),
    solarSystemId: int(c.system_id),
    stationId: npcStationOf(c),
    price: num(c.price),
    reward: num(c.reward),
    collateral: num(c.collateral),
    buyout: num(c.buyout) ? num(c.buyout) : null,
  };
};

/** An item row in ESI's shape, from contract_items.csv. */
export const itemFromSnapshot = (i: Row): ContractItemRow => ({
  record_id: Number(i.record_id),
  type_id: Number(i.type_id),
  quantity: Number(i.quantity),
  is_included: i.is_included === "true",
  ...(i.item_id ? { item_id: Number(i.item_id) } : {}),
  ...(bool(i.is_blueprint_copy) === undefined
    ? {}
    : { is_blueprint_copy: bool(i.is_blueprint_copy) }),
  ...(int(i.material_efficiency) === null
    ? {}
    : { material_efficiency: int(i.material_efficiency) ?? undefined }),
  ...(int(i.time_efficiency) === null
    ? {}
    : { time_efficiency: int(i.time_efficiency) ?? undefined }),
  ...(int(i.runs) === null ? {} : { runs: int(i.runs) ?? undefined }),
});

/**
 * Each region's listing in a snapshot. A region's observation time is the
 * Last-Modified EVE Ref recorded for it, the same key ESI gives the job; a
 * region listed with none (or several, or none recorded) falls back to the
 * scrape time. Regions the timeline knows that the snapshot lists nothing in
 * are observed empty, as the predecessor counted them.
 */
export const listingsOfSnapshot = (
  data: SnapshotData,
  scrapeTime: number,
  knownRegions: Iterable<number>,
): RegionListing[] => {
  const byRegion = new Map<number, Row[]>();
  for (const c of data.contracts) {
    const r = Number(c.region_id);
    const list = byRegion.get(r);
    if (list) list.push(c);
    else byRegion.set(r, [c]);
  }
  for (const r of knownRegions) if (!byRegion.has(r)) byRegion.set(r, []);
  return [...byRegion].map(([regionId, rows]) => {
    const modified = new Set(rows.map((c) => c.http_last_modified ?? ""));
    const [only] = modified;
    const lm = modified.size === 1 && only ? Date.parse(only) : Number.NaN;
    return {
      regionId,
      observedAt: Number.isFinite(lm) ? lm : scrapeTime,
      contracts: rows.map(contractRowFromSnapshot),
    };
  });
};

/** The snapshot's mutated items, in ESI's /dogma/dynamic shape. */
export const dynamicOfSnapshot = (data: SnapshotData) => {
  const dynamic = new Map<number, DynamicItemData>();
  for (const d of data.dynamic) {
    dynamic.set(Number(d.item_id), {
      created_by: Number(d.created_by),
      source_type_id: Number(d.source_type_id),
      mutator_type_id: Number(d.mutator_type_id),
      dogma_attributes: [],
      dogma_effects: [],
    });
  }
  // A mutated item listed in several contracts appears once per contract.
  const seen = new Set<string>();
  for (const a of data.dynAttrs) {
    const key = `${a.item_id}:${a.attribute_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dynamic.get(Number(a.item_id))?.dogma_attributes.push({
      attribute_id: Number(a.attribute_id),
      value: Number(a.value),
    });
  }
  for (const e of data.dynEffects) {
    const key = `${e.item_id}:e${e.effect_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dynamic.get(Number(e.item_id))?.dogma_effects.push({
      effect_id: Number(e.effect_id),
      is_default: e.is_default === "true",
    });
  }
  return dynamic;
};

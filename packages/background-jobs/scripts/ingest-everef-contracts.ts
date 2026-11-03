/**
 * Ingest EVE Ref's public-contract snapshots
 * (https://data.everef.net/public-contracts/history/) into Contract /
 * ContractItem / ContractBid / DynamicItem*, oldest snapshot first. The in-repo
 * successor of `.backfill-data/contracts/ingest_contracts.mts`, with the same
 * command line and the same state file, so it resumes where that one stopped:
 *
 *   pnpm --filter @jitaspace/background-jobs ingest-everef-contracts \
 *     --state <dir>/state.json [--from YYYY-MM-DD] [--max-snapshots N] [--max-db-gb N]
 *
 * Unlike its predecessor it keeps no timeline of its own. Every snapshot goes
 * through the shared timeline store, as the `esi-sync-public-contracts` job's
 * listings do: an observation is keyed by the listing's Last-Modified (EVE Ref
 * records it per row as `http_last_modified`), so a listing both of them read
 * is one observation, and the two can run in any order, or at the same time,
 * and leave the same rows. state.json now only says which snapshot to resume
 * after; its old `outstanding` and `regionHistory` are left as they were and
 * never read.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { RegionListing } from "../helpers/contractTimelineStore";
import type { ContractRow } from "../helpers/publicContracts";
import type {
  ContractBid,
  ContractItemRow,
  ContractItems,
  DynamicItemData,
} from "../helpers/publicContractsDb";
import { prisma } from "../db";
import {
  applyRegionListing,
  checkpointContractTimeline,
  pruneContractTimeline,
} from "../helpers/contractTimelineStore";
import { contractTypeOf, TYPES_WITH_ITEMS } from "../helpers/publicContracts";
import {
  contractsWithItemsOf,
  ensureReferences,
  mutatedItemsOf,
  storedContractIdsOf,
  writeContractBids,
  writeContractItems,
} from "../helpers/publicContractsDb";

const UA = "JitaSpace (https://www.jita.space)";
const BASE = "https://data.everef.net/public-contracts/history";
const SIZE_CHECK_EVERY = 20;
/** lastSeenAt is checkpointed daily, and when the ingest stops cleanly. */
const CHECKPOINT_MS = 24 * 60 * 60 * 1000;

const args = process.argv.slice(2);
const arg = (k: string) =>
  args.includes(k) ? args[args.indexOf(k) + 1] : undefined;
const STATE = arg("--state");
const FROM = arg("--from") ?? "2021-06-17";
const MAX_SNAPSHOTS = Number(arg("--max-snapshots") ?? Infinity);
const MAX_DB_GB = Number(arg("--max-db-gb") ?? 9);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);

// ------------------------------------------------------------------ state ---
interface State {
  lastSnapshot: string | null;
  lastCheckpoint: number;
  stats: Record<string, number>;
  /** The predecessor's fields, kept as they are. */
  [legacy: string]: unknown;
}
const loadState = (file: string): State =>
  fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf8")) as State)
    : { lastSnapshot: null, lastCheckpoint: 0, stats: {} };
const saveState = (file: string, state: State) => {
  fs.writeFileSync(file + ".tmp", JSON.stringify(state));
  fs.renameSync(file + ".tmp", file);
};

// -------------------------------------------------------------- download ---
// Retries the whole download, body included: a connection dropped mid-body
// ("other side closed") is as transient as a failed request.
const fetchBody = async (url: string): Promise<Buffer | null> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(300_000),
      });
      if (res.status === 404) return null;
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      log(`HTTP ${res.status} ${url}`);
    } catch (e) {
      log(`fetch ${url}: ${(e as Error).message}`);
    }
    await sleep(Math.min(600_000, 5000 * 2 ** attempt));
  }
};

interface Snapshot {
  name: string;
  url: string;
  time: number;
}

/** Snapshots in order, one day's index at a time. */
async function* snapshotsInOrder(after: string | null) {
  const today = new Date();
  const resumeDay = after?.slice(17, 27); // public-contracts-YYYY-MM-DD_...
  for (
    let d = new Date(FROM + "T00:00:00Z");
    d <= today;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const day = d.toISOString().slice(0, 10);
    if (resumeDay && day < resumeDay) continue;
    const body = await fetchBody(
      `${BASE}/${day.slice(0, 4)}/${day}/index.json`,
    );
    if (!body) continue;
    const idx = JSON.parse(body.toString("utf8")) as {
      files: { name: string; url: string; file_time: string }[];
    };
    yield* idx.files
      .filter(
        (f) => f.name.endsWith(".v2.tar.bz2") && (!after || f.name > after),
      )
      .map((f) => ({ name: f.name, url: f.url, time: Date.parse(f.file_time) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

// ------------------------------------------------------------------ parse ---
type Row = Record<string, string>;
/** RFC 4180-ish CSV (quoted fields, doubled quotes, CRLF), as EVE Ref writes it. */
export const parseCsv = (text: string): Row[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (ch !== "\r") cur += ch;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row);
  }
  const [header, ...data] = rows;
  if (!header) return [];
  return data
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
};

/**
 * meta.json's scrape_start: an ISO string until late Oct 2022, then epoch
 * seconds. Null when unreadable, so the index's file_time is used.
 */
const parseScrapeTime = (v: unknown) => {
  const ms =
    typeof v === "number" || (typeof v === "string" && /^\d+(\.\d+)?$/.test(v))
      ? Number(v) * 1000
      : typeof v === "string"
        ? Date.parse(v)
        : NaN;
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

const readSnapshot = async (snap: { url: string }) => {
  const buf = await fetchBody(snap.url);
  if (!buf) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "everef-contracts-"));
  try {
    fs.writeFileSync(path.join(dir, "s.tar.bz2"), buf);
    execFileSync("tar", ["-xjf", path.join(dir, "s.tar.bz2"), "-C", dir]);
    return readSnapshotDir(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

// --------------------------------------------------------------- mapping ---
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
const itemFromSnapshot = (i: Row): ContractItemRow => ({
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
    const lm = modified.size === 1 && only ? Date.parse(only) : NaN;
    return {
      regionId,
      observedAt: Number.isFinite(lm) ? lm : scrapeTime,
      contracts: rows.map(contractRowFromSnapshot),
    };
  });
};

/** The snapshot's mutated items, in ESI's /dogma/dynamic shape. */
const dynamicOfSnapshot = (data: SnapshotData) => {
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

/** Regions the timeline has observed, or holds outstanding contracts in. */
const knownRegionsOf = async () =>
  (
    await prisma.$queryRaw<{ regionId: number }[]>`
      SELECT DISTINCT "regionId" FROM "ContractRegionObservation"
      UNION SELECT DISTINCT "regionId" FROM "Contract" WHERE "isDeleted" = false`
  ).map((r) => r.regionId);

// ------------------------------------------------------------ one snapshot ---
/**
 * Apply one snapshot: references, then every region's listing through the
 * shared timeline, then the items, mutated items and bids it carries for
 * contracts that lack them. Idempotent: replaying a snapshot changes nothing.
 */
export const applySnapshot = async (
  snap: { name: string; time: number },
  data: SnapshotData,
) => {
  const t = data.scrapeStart ?? snap.time;
  if (!Number.isFinite(t)) throw new Error(`${snap.name}: no usable time`);
  const listings = listingsOfSnapshot(data, t, await knownRegionsOf());
  const rows = listings.flatMap((l) => l.contracts);

  const stored = await storedContractIdsOf(rows.map((r) => r.contractId));
  const unstored = rows.filter((r) => !stored.has(r.contractId));
  await ensureReferences({
    characterIds: unstored.map((r) => r.issuerId),
    corporationIds: unstored.map((r) => r.issuerCorporationId),
    stationIds: unstored.flatMap((r) => r.stationId ?? []),
  });

  const totals = {
    inserted: 0,
    reopened: 0,
    ended: 0,
    corrected: 0,
    refused: 0,
  };
  for (const listing of listings) {
    const a = await applyRegionListing(listing);
    totals.inserted += a.inserted.length;
    totals.reopened += a.reopened.length;
    totals.ended += a.ended.length;
    totals.corrected += a.corrected.length;
    if (a.refused) totals.refused++;
  }

  // Items for listed contracts that have none yet (whoever stored them).
  const withItemTypes = rows
    .filter((r) => TYPES_WITH_ITEMS.has(r.type))
    .map((r) => r.contractId);
  const filled = await contractsWithItemsOf(withItemTypes);
  const need = new Set(withItemTypes.filter((id) => !filled.has(id)));
  const byContract = new Map<number, ContractItemRow[]>();
  for (const i of data.items) {
    const id = Number(i.contract_id);
    if (!need.has(id)) continue;
    const list = byContract.get(id);
    if (list) list.push(itemFromSnapshot(i));
    else byContract.set(id, [itemFromSnapshot(i)]);
  }
  const contracts: ContractItems[] = [...byContract].map(
    ([contractId, items]) => ({ contractId, items }),
  );
  const { mutated, known } = await mutatedItemsOf(contracts);
  const { written, blocked } = await writeContractItems({
    contracts,
    dynamic: dynamicOfSnapshot(data),
    mutated,
    known,
  });

  // Bids on any listed contract (they never change; already-stored ones are
  // left alone).
  const listed = new Set(rows.map((r) => r.contractId));
  const bids: ContractBid[] = data.bids
    .filter((b) => listed.has(Number(b.contract_id)))
    .map((b) => ({
      contractId: Number(b.contract_id),
      bidId: Number(b.bid_id),
      amount: Number(b.amount),
      dateBid: b.date_bid ?? "",
    }));
  await writeContractBids(bids);

  return {
    contracts: rows.length,
    regions: listings.length,
    ...totals,
    itemsWritten: written.length,
    itemsBlocked: blocked.length,
    bids: bids.length,
  };
};

// ------------------------------------------------------------------- main ---
const main = async (stateFile: string) => {
  const state = loadState(stateFile);
  const bump = (k: string, n = 1) => {
    state.stats[k] = (state.stats[k] ?? 0) + n;
  };
  // Set by the signal handlers; an object so the loop re-reads it.
  const signal = { stop: false };
  process.on("SIGINT", () => {
    signal.stop = true;
    log("stopping after this snapshot");
  });
  process.on("SIGTERM", () => {
    signal.stop = true;
    log("stopping after this snapshot");
  });

  log(
    `starting from ${FROM} (resuming after ${state.lastSnapshot ?? "nothing"})`,
  );
  let n = 0;
  let db = 0;
  // Prefetch: while one snapshot is written, the next is downloaded and
  // parsed. At most one download is in flight at any time.
  const it = snapshotsInOrder(state.lastSnapshot)[Symbol.asyncIterator]();
  let cur = await it.next();
  let curData = cur.done ? null : readSnapshot(cur.value);
  while (!cur.done) {
    if (signal.stop || n >= MAX_SNAPSHOTS) break;
    const started = performance.now();
    const snap: Snapshot = cur.value;
    const data = await curData;
    const nxt = await it.next();
    const nxtData = nxt.done ? null : readSnapshot(nxt.value);
    if (!data) log("missing", snap.name);
    else {
      const r = await applySnapshot(snap, data);
      for (const [k, v] of Object.entries(r)) bump(k, v);
      const t = data.scrapeStart ?? snap.time;
      if (t - state.lastCheckpoint >= CHECKPOINT_MS) {
        await checkpointContractTimeline();
        await pruneContractTimeline(t);
        state.lastCheckpoint = t;
      }
      state.lastSnapshot = snap.name;
      saveState(stateFile, state);
      n++;
      if (n % SIZE_CHECK_EVERY === 1) {
        db = Number(
          (
            await prisma.$queryRaw<{ b: bigint }[]>`
              SELECT pg_database_size(current_database()) b`
          )[0]?.b ?? 0,
        );
      }
      log(
        snap.name,
        JSON.stringify(r),
        `${((performance.now() - started) / 1000).toFixed(1)}s`,
        `db ${(db / 1e9).toFixed(2)} GB`,
      );
      if (db > MAX_DB_GB * 1e9) {
        log(`database over ${MAX_DB_GB} GB guard; stopping`);
        await nxtData;
        break;
      }
    }
    cur = nxt;
    curData = nxtData;
  }
  // Final checkpoint, so lastSeenAt is current however the run ends cleanly.
  await checkpointContractTimeline();
  saveState(stateFile, state);
  log("done", JSON.stringify(state.stats));
  await prisma.$disconnect();
};

if (process.argv[1]?.endsWith("ingest-everef-contracts.ts")) {
  if (!STATE) {
    console.error("--state <path to state.json> is required");
    process.exit(2);
  }
  await main(STATE);
  process.exit(0);
}

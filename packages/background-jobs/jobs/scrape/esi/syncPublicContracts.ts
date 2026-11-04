import type {
  ContractsPublicBidsContractIdGet,
  ContractsPublicItemsContractIdGet,
  DogmaDynamicItemsTypeIdItemIdGet,
} from "@jitaspace/esi-client";
import {
  getConfig,
  getContractsPublicBidsContractId,
  getContractsPublicItemsContractId,
  getContractsPublicRegionId,
  getDogmaDynamicItemsTypeIdItemId,
  setUserAgent,
} from "@jitaspace/esi-client";

import type { JobLogger } from "../../../core";
import type { RegionHistory } from "../../../helpers/contractTimeline.ts";
import type { AppliedListing } from "../../../helpers/contractTimelineStore.ts";
import type { EsiGate, EsiOutcome } from "../../../helpers/esiRequestGate.ts";
import type { EsiPublicContract } from "../../../helpers/publicContracts.ts";
import type {
  ContractBid,
  ContractItems,
  DynamicItemData,
} from "../../../helpers/publicContractsDb.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  applyRegionListing,
  checkpointContractTimeline,
} from "../../../helpers/contractTimelineStore.ts";
import {
  createEsiGate,
  lastModifiedOf,
  pagesOf,
} from "../../../helpers/esiRequestGate.ts";
import {
  contractRowFromEsi,
  contractTypeOf,
  npcStationOf,
  selectAuctionsForBids,
  TYPES_WITH_BIDS,
  TYPES_WITH_ITEMS,
} from "../../../helpers/publicContracts.ts";
import {
  contractsWithItemsOf,
  ensureReferences,
  mutatedItemsOf,
  stationSystemsOf,
  storedContractIdsOf,
  writeContractBids,
  writeContractItems,
} from "../../../helpers/publicContractsDb.ts";
import { getRedis } from "../../../kv";

/** Redis key holding {@link SyncState}. */
export const PUBLIC_CONTRACTS_STATE_KEY = "contracts:public:esi-sync";

/** Sent as X-User-Agent on every ESI request this job makes. */
export const ESI_USER_AGENT =
  "JitaSpace background jobs (https://www.jita.space)";

/** Concurrent ESI requests. ~470 per steady-state run, so this is ~1 minute. */
const ESI_CONCURRENCY = 8;
/**
 * Contracts whose items are fetched per run. Steady state needs ~100–300; the
 * cap bounds a catch-up after downtime, oldest-expiring first, and the rest
 * carry over to the next run.
 */
const MAX_ITEM_CONTRACTS_PER_RUN = 6000;
/**
 * When ESI cannot give a contract's items (403 once accepted, 404, an empty
 * answer) or they name a type or dogma the SDE ingest has not stored yet, ask
 * again only after this long. A contract that is gone ends the next run and
 * leaves the queue; one blocked on the SDE retries a few times a day.
 */
const ITEMS_RETRY_AFTER_MS = 6 * 60 * 60 * 1000;
/** lastSeenAt is checkpointed this often. */
const CHECKPOINT_MS = 24 * 60 * 60 * 1000;

/**
 * What the job keeps between runs, in Redis. Losing it costs little: items are
 * re-checked from the database, and each region starts its history again from
 * the contracts stored as outstanding there (so the first contracts to end
 * take their stored, checkpointed lastSeenAt).
 */
export interface SyncState {
  /** Each region's listing history, by region ID. */
  regions: Record<string, RegionHistory>;
  /** Contracts whose items still need fetching, with the earliest next try. */
  itemsPending: Record<string, number>;
  /** Epoch ms of the last checkpoint; 0 if none. */
  lastCheckpointAt: number;
}

export interface SyncPublicContractsPayload {
  /** Limit the run to these regions (manual runs and local testing). */
  regionIds?: number[];
}

const loadState = async (): Promise<SyncState | null> => {
  const raw = await (await getRedis()).get(PUBLIC_CONTRACTS_STATE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<SyncState>;
  return {
    regions: parsed.regions ?? {},
    itemsPending: parsed.itemsPending ?? {},
    lastCheckpointAt: parsed.lastCheckpointAt ?? 0,
  };
};

const saveState = async (state: SyncState) =>
  (await getRedis()).set(PUBLIC_CONTRACTS_STATE_KEY, JSON.stringify(state));

type RegionFetch =
  | {
      regionId: number;
      ok: true;
      observedAt: number;
      contracts: EsiPublicContract[];
    }
  | { regionId: number; ok: false; reason: string };

/**
 * Every page of one region's listing. Pages must share one Last-Modified: a
 * listing regenerated mid-way can shift contracts between pages, so it is
 * fetched again once, then given up on for this run.
 */
const fetchRegionListing = async (
  gate: EsiGate,
  regionId: number,
): Promise<RegionFetch> => {
  const page = (n: number) =>
    gate.request((signal) =>
      getContractsPublicRegionId(regionId, { page: n }, undefined, {
        signal,
        userAgent: ESI_USER_AGENT,
      }),
    );
  for (let attempt = 1; attempt <= 2; attempt++) {
    const first = await page(1);
    if (!first.ok) {
      return { regionId, ok: false, reason: `HTTP ${first.status ?? "none"}` };
    }
    const observedAt = lastModifiedOf(first.headers);
    if (observedAt === undefined) {
      return { regionId, ok: false, reason: "no Last-Modified" };
    }
    const pages = pagesOf(first.headers);
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => page(i + 2)),
    );
    for (const r of rest) {
      if (!r.ok) {
        return { regionId, ok: false, reason: `HTTP ${r.status ?? "none"}` };
      }
    }
    if (rest.every((r) => r.ok && lastModifiedOf(r.headers) === observedAt)) {
      return {
        regionId,
        ok: true,
        observedAt,
        contracts: [first, ...rest].flatMap((r) => (r.ok ? r.data : [])),
      };
    }
  }
  return { regionId, ok: false, reason: "pages changed while paginating" };
};

/**
 * Every page of a paginated per-contract route (items, bids). ESI answers 204
 * ("Contract expired or recently accepted by player") with no body: no rows.
 */
const fetchAllPages = async <T>(
  gate: EsiGate,
  get: (
    page: number,
    signal: AbortSignal,
  ) => Promise<{
    data: unknown;
    status: number;
    headers: Record<string, unknown>;
  }>,
): Promise<EsiOutcome<T[]>> => {
  const rowsOf = (data: unknown) => (Array.isArray(data) ? (data as T[]) : []);
  const first = await gate.request((signal) => get(1, signal));
  if (!first.ok) return first;
  if (first.status === 204) return { ...first, data: [] };
  const rest = await Promise.all(
    Array.from({ length: pagesOf(first.headers) - 1 }, (_, i) =>
      gate.request((signal) => get(i + 2, signal)),
    ),
  );
  const rows = rowsOf(first.data);
  for (const r of rest) {
    if (!r.ok) return r;
    rows.push(...rowsOf(r.data));
  }
  return { ...first, data: rows };
};

/**
 * Items for queued contracts that have none yet, and the dogma of any mutated
 * item not already stored. A contract is written whole or not at all: if a
 * mutated item's fetch fails transiently it stays queued; if ESI refuses it
 * (our request is wrong) or it names a type or dogma we lack, it waits.
 */
const syncItems = async ({
  gate,
  state,
  listed,
  now,
  logger,
}: {
  gate: EsiGate;
  state: SyncState;
  /** Contracts in this run's listings, with their expiry. */
  listed: ReadonlyMap<number, { dateExpired: number }>;
  now: number;
  logger: JobLogger;
}) => {
  const due = Object.entries(state.itemsPending)
    .map(([id, notBefore]) => ({ contractId: Number(id), notBefore }))
    .filter((p) => p.notBefore <= now && listed.has(p.contractId))
    .sort(
      (a, b) =>
        (listed.get(a.contractId)?.dateExpired ?? 0) -
        (listed.get(b.contractId)?.dateExpired ?? 0),
    )
    .slice(0, MAX_ITEM_CONTRACTS_PER_RUN)
    .map((p) => p.contractId);
  const stats = {
    queued: Object.keys(state.itemsPending).length,
    due: due.length,
    written: 0,
    alreadyStored: 0,
    unavailable: 0,
    blocked: 0,
    transient: 0,
    items: 0,
    dynamicFetched: 0,
    dynamicNotFound: 0,
  };
  if (due.length === 0) return stats;

  // Contracts an earlier attempt (or the EVE Ref import) already filled.
  const stored = await contractsWithItemsOf(due);
  for (const id of stored) delete state.itemsPending[id];
  stats.alreadyStored = stored.size;

  const fetched: ContractItems[] = [];
  const defer = (contractId: number) => {
    state.itemsPending[contractId] = now + ITEMS_RETRY_AFTER_MS;
  };
  await Promise.all(
    due
      .filter((id) => !stored.has(id))
      .map(async (contractId) => {
        const res = await fetchAllPages<
          ContractsPublicItemsContractIdGet[number]
        >(gate, (page, signal) =>
          getContractsPublicItemsContractId(contractId, { page }, undefined, {
            signal,
            userAgent: ESI_USER_AGENT,
          }),
        );
        if (res.ok && res.data.length > 0) {
          fetched.push({ contractId, items: res.data });
        } else if (!res.ok && res.transient) {
          stats.transient++;
        } else {
          // 403 (no longer public), 404, 204 or an empty list: asking again
          // costs an error and gets the same answer.
          stats.unavailable++;
          defer(contractId);
        }
      }),
  );
  if (fetched.length === 0) return stats;

  const { mutated, known } = await mutatedItemsOf(fetched);
  const dynamic = new Map<number, DynamicItemData>();
  /** Failed transiently: its contract stays queued as it is. */
  const dynamicFailed = new Set<number>();
  /** Refused (400 and the like): our request is wrong, so don't store half. */
  const dynamicRejected = new Set<number>();
  await Promise.all(
    [...new Map(mutated.map((m) => [m.itemId, m])).values()]
      .filter((m) => !known.has(m.itemId))
      .map(async ({ itemId, typeId }) => {
        const res = await gate.request<DogmaDynamicItemsTypeIdItemIdGet>(
          (signal) =>
            // Kubb orders path parameters alphabetically: item, then type.
            getDogmaDynamicItemsTypeIdItemId(itemId, typeId, undefined, {
              signal,
              userAgent: ESI_USER_AGENT,
            }),
        );
        if (res.ok) dynamic.set(itemId, res.data);
        // 404: no such mutated item; its contract is stored without the link.
        else if (res.status === 404) stats.dynamicNotFound++;
        else if (res.transient) dynamicFailed.add(itemId);
        else dynamicRejected.add(itemId);
      }),
  );
  stats.dynamicFetched = dynamic.size;

  const mutatedOf = (contractId: number) =>
    mutated.filter((m) => m.contractId === contractId).map((m) => m.itemId);
  const ready = fetched.filter((f) => {
    const mine = mutatedOf(f.contractId);
    if (mine.some((id) => dynamicFailed.has(id))) {
      stats.transient++;
      return false;
    }
    if (mine.some((id) => dynamicRejected.has(id))) {
      stats.blocked++;
      logger.warn("ESI refused a mutated item; contract items not stored", {
        contractId: f.contractId,
      });
      defer(f.contractId);
      return false;
    }
    return true;
  });
  const { written, blocked } = await writeContractItems({
    contracts: ready,
    dynamic,
    mutated,
    known,
  });
  for (const id of blocked) {
    stats.blocked++;
    logger.warn("Contract names a type or dogma not in the SDE yet", {
      contractId: id,
    });
    defer(id);
  }
  for (const id of written) delete state.itemsPending[id];
  stats.written = written.length;
  stats.items = ready
    .filter((r) => written.includes(r.contractId))
    .reduce((n, r) => n + r.items.length, 0);
  return stats;
};

/** Bids for the auctions {@link selectAuctionsForBids} picks this run. */
const syncBids = async ({
  gate,
  contractIds,
}: {
  gate: EsiGate;
  contractIds: number[];
}) => {
  const bids: ContractBid[] = [];
  let unavailable = 0;
  await Promise.all(
    contractIds.map(async (contractId) => {
      const res = await fetchAllPages<ContractsPublicBidsContractIdGet[number]>(
        gate,
        (page, signal) =>
          getContractsPublicBidsContractId(contractId, { page }, undefined, {
            signal,
            userAgent: ESI_USER_AGENT,
          }),
      );
      if (!res.ok) {
        // Gone (403) or failed; the rotation asks again within six hours.
        unavailable++;
        return;
      }
      for (const b of res.data) {
        bids.push({
          contractId,
          bidId: b.bid_id,
          amount: b.amount,
          dateBid: b.date_bid,
        });
      }
    }),
  );
  await writeContractBids(bids);
  return { auctions: contractIds.length, bids: bids.length, unavailable };
};

export const syncPublicContracts = defineJob<SyncPublicContractsPayload>({
  id: "esi-sync-public-contracts",
  name: "Sync public contracts from ESI",
  // ESI regenerates each region's listing every 30 minutes, at a fixed phase
  // per region: :08–:11 and :38–:41 past the hour (2026-11-03). Polling at
  // :14 and :44 reads every region's fresh listing.
  trigger: { type: "cron", cron: "TZ=UTC 14,44 * * * *" },
  singleton: true,
  // Every write is idempotent and a listing already applied is skipped, so a
  // retry repeats only what had not landed.
  retries: 2,
  // A catch-up after downtime fetches thousands of contracts' items.
  maxDurationSeconds: 1500,
  description:
    "Poll ESI's public contracts in every region; record new contracts, their items and auction bids, and end the ones that are gone",
  handler: async (ctx) => {
    const now = Date.now();
    // The reference helper's ESI calls take the client's global config; give
    // them this job's identity unless something already set one.
    if (!getConfig().userAgent) setUserAgent(ESI_USER_AGENT);
    const gate = createEsiGate({ concurrency: ESI_CONCURRENCY });

    // Scheduled runs get Trigger's schedule object, which has no regionIds.
    const regionIds =
      (ctx.payload as SyncPublicContractsPayload | undefined)?.regionIds ??
      (
        await prisma.region.findMany({
          select: { regionId: true },
          where: { isDeleted: false },
          orderBy: { regionId: "asc" },
        })
      ).map((r) => r.regionId);
    const fetches = await Promise.all(
      regionIds.map((id) => fetchRegionListing(gate, id)),
    );
    const observed = fetches.filter((l) => l.ok);
    const failedRegions = fetches.filter((l) => !l.ok);
    for (const f of failedRegions) {
      ctx.logger.warn("Region listing unavailable; not applied this run", {
        regionId: f.regionId,
        reason: f.reason,
      });
    }
    if (observed.length === 0) {
      // ESI is down (daily downtime, an outage): nothing to learn, and no
      // contract is counted as missing.
      return {
        stats: { regions: regionIds.length, observed: 0, esi: gate.stats },
      };
    }
    const listedContracts = observed.flatMap((l) => l.contracts);

    // References of contracts not stored yet, before any timeline write.
    const stored = await storedContractIdsOf(
      listedContracts.map((c) => c.contract_id),
    );
    const unstored = listedContracts.filter((c) => !stored.has(c.contract_id));
    await ensureReferences({
      characterIds: unstored.map((c) => c.issuer_id),
      corporationIds: unstored.map((c) => c.issuer_corporation_id),
      stationIds: unstored.flatMap((c) => npcStationOf(c) ?? []),
    });
    const stationSystems = await stationSystemsOf(
      listedContracts.flatMap((c) => npcStationOf(c) ?? []),
    );

    let state = await loadState();
    const regions = state?.regions ?? {};
    // One region at a time, each in its own transaction.
    const applied: AppliedListing[] = [];
    for (const l of observed) {
      const a = await applyRegionListing(
        {
          regionId: l.regionId,
          observedAt: l.observedAt,
          contracts: l.contracts.map((c) =>
            contractRowFromEsi(c, l.regionId, stationSystems),
          ),
        },
        regions[l.regionId] ?? null,
      );
      if (a.history) regions[l.regionId] = a.history;
      applied.push(a);
    }
    const incomplete = applied
      .filter((a) => !a.skipped && !a.complete)
      .map((a) => a.regionId);
    if (incomplete.length > 0) {
      ctx.logger.warn("Listing looks incomplete; nothing ended there", {
        regionIds: incomplete,
      });
    }

    if (!state) {
      // First run (or the state was lost): queue outstanding contracts that
      // have no items yet.
      ctx.logger.info("No sync state on record; checking items from scratch");
      const withItems = await prisma.contract.findMany({
        select: { contractId: true },
        where: {
          isDeleted: false,
          type: { in: [...TYPES_WITH_ITEMS] },
        },
      });
      const itemless = await prisma.$queryRaw<{ id: number }[]>`
        SELECT c.id FROM unnest(${withItems.map((c) => c.contractId)}::int[]) AS c(id)
        WHERE NOT EXISTS (SELECT 1 FROM "ContractItem" i WHERE i."contractId" = c.id)`;
      state = {
        regions,
        itemsPending: Object.fromEntries(itemless.map((c) => [c.id, 0])),
        lastCheckpointAt: 0,
      };
    }
    const typeOf = new Map(
      listedContracts.map((c) => [c.contract_id, contractTypeOf(c)]),
    );
    for (const id of applied.flatMap((a) => [...a.inserted, ...a.reopened])) {
      const type = typeOf.get(id);
      if (
        type &&
        TYPES_WITH_ITEMS.has(type) &&
        !Object.hasOwn(state.itemsPending, id)
      ) {
        state.itemsPending[id] = 0;
      }
    }
    // Queued contracts that are no longer outstanding are done with.
    const pendingIds = Object.keys(state.itemsPending).map(Number);
    const live = new Set(
      (
        await prisma.contract.findMany({
          select: { contractId: true },
          where: { contractId: { in: pendingIds }, isDeleted: false },
        })
      ).map((c) => c.contractId),
    );
    for (const id of pendingIds) {
      if (!live.has(id)) delete state.itemsPending[id];
    }

    let checkpointed = 0;
    if (now - state.lastCheckpointAt >= CHECKPOINT_MS) {
      checkpointed = await checkpointContractTimeline(
        Object.entries(regions).flatMap(([regionId, h]) =>
          h.lastCompleteAt === null
            ? []
            : [
                {
                  regionId: Number(regionId),
                  lastCompleteAt: h.lastCompleteAt,
                },
              ],
        ),
      );
      state.lastCheckpointAt = now;
    }
    await saveState(state);

    const listed = new Map(
      listedContracts.map((c) => [
        c.contract_id,
        { dateExpired: Date.parse(c.date_expired) },
      ]),
    );
    const items = await syncItems({
      gate,
      state,
      listed,
      now,
      logger: ctx.logger,
    });
    await saveState(state);

    const newIds = new Set(
      applied.flatMap((a) => [...a.inserted, ...a.reopened]),
    );
    // A listed contract is outstanding: the listing that showed it says so.
    const auctions = listedContracts
      .filter((c) => TYPES_WITH_BIDS.has(contractTypeOf(c)))
      .map((c) => ({
        contractId: c.contract_id,
        dateExpired: Date.parse(c.date_expired),
      }));
    const bids = await syncBids({
      gate,
      contractIds: selectAuctionsForBids(auctions, newIds, now),
    });

    const endReasons: Record<string, number> = {};
    for (const e of applied.flatMap((a) => a.ended)) {
      const key = e.reason ?? "unknown";
      endReasons[key] = (endReasons[key] ?? 0) + 1;
    }
    const sum = (f: (a: AppliedListing) => number) =>
      applied.reduce((n, a) => n + f(a), 0);
    return {
      stats: {
        regions: regionIds.length,
        observed: observed.length,
        failedRegions: failedRegions.map((f) => f.regionId),
        skippedRegions: applied.filter((a) => a.skipped).map((a) => a.regionId),
        incompleteRegions: incomplete,
        listed: listedContracts.length,
        inserted: sum((a) => a.inserted.length),
        reopened: sum((a) => a.reopened.length),
        ended: sum((a) => a.ended.length),
        endReasons,
        checkpointed,
        items,
        bids,
        esi: gate.stats,
      },
    };
  },
});

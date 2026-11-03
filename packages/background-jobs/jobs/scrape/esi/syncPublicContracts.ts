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
import type { Prisma } from "../../../db";
import type { TimelineState } from "../../../helpers/contractTimeline.ts";
import type { EsiGate, EsiOutcome } from "../../../helpers/esiRequestGate.ts";
import type { EsiPublicContract } from "../../../helpers/publicContracts.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  emptyTimelineState,
  planContractTimeline,
  seedRegionHistories,
} from "../../../helpers/contractTimeline.ts";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
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
import { getRedis } from "../../../kv";

/** Redis key holding {@link SyncState}. */
export const PUBLIC_CONTRACTS_STATE_KEY = "contracts:public:esi-sync";

/** Sent as X-User-Agent on every ESI request this job makes. */
export const ESI_USER_AGENT =
  "JitaSpace background jobs (https://www.jita.space)";

/** Concurrent ESI requests. ~550 per steady-state run, so this is ~1 minute. */
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
 * again only after this long. A contract that is gone ends within two runs and
 * leaves the queue; one blocked on the SDE retries a few times a day.
 */
const ITEMS_RETRY_AFTER_MS = 6 * 60 * 60 * 1000;
/** Rows per INSERT/UPDATE statement. */
const WRITE_CHUNK = 5000;

/**
 * What the job keeps between runs. The outstanding set itself is the
 * database's (`Contract` where isDeleted = false); this holds what the
 * database has no column for.
 */
export interface SyncState extends TimelineState {
  /** Contracts whose items still need fetching, with the earliest next try. */
  itemsPending: Record<string, number>;
}

export interface SyncPublicContractsPayload {
  /** Limit the run to these regions (manual runs and local testing). */
  regionIds?: number[];
}

const chunks = <T>(xs: readonly T[], size = WRITE_CHUNK) => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

const iso = (ms: number | Date) => new Date(ms).toISOString();

const loadState = async (): Promise<SyncState | null> => {
  const raw = await (await getRedis()).get(PUBLIC_CONTRACTS_STATE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<SyncState>;
  return {
    ...emptyTimelineState(),
    itemsPending: {},
    ...parsed,
  };
};

const saveState = async (state: SyncState) =>
  (await getRedis()).set(PUBLIC_CONTRACTS_STATE_KEY, JSON.stringify(state));

type RegionListing =
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
): Promise<RegionListing> => {
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
 * Store whichever issuers, issuer corporations, creators and NPC stations the
 * database lacks, so the rows written next keep their foreign keys. Checked
 * here first: the helper logs its whole status on every call.
 */
const ensureReferences = async ({
  characterIds = [],
  corporationIds = [],
  stationIds = [],
}: {
  characterIds?: number[];
  corporationIds?: number[];
  stationIds?: number[];
}) => {
  const [characters, corporations, stations] = await Promise.all([
    prisma.character.findMany({
      select: { characterId: true },
      where: { characterId: { in: [...new Set(characterIds)] } },
    }),
    prisma.corporation.findMany({
      select: { corporationId: true },
      where: { corporationId: { in: [...new Set(corporationIds)] } },
    }),
    prisma.station.findMany({
      select: { stationId: true },
      where: { stationId: { in: [...new Set(stationIds)] } },
    }),
  ]);
  const have = {
    characters: new Set(characters.map((c) => c.characterId)),
    corporations: new Set(corporations.map((c) => c.corporationId)),
    stations: new Set(stations.map((s) => s.stationId)),
  };
  const missing = {
    missingCharacterIds: new Set(
      characterIds.filter((id) => !have.characters.has(id)),
    ),
    missingCorporationIds: new Set(
      corporationIds.filter((id) => !have.corporations.has(id)),
    ),
    missingStationIds: new Set(
      stationIds.filter((id) => !have.stations.has(id)),
    ),
  };
  const count =
    missing.missingCharacterIds.size +
    missing.missingCorporationIds.size +
    missing.missingStationIds.size;
  if (count > 0) await createCorpAndItsRefRecords(missing);
  return count;
};

const insertContracts = async (
  tx: Prisma.TransactionClient,
  rows: ReturnType<typeof contractRowFromEsi>[],
) => {
  for (const c of chunks(rows)) {
    await tx.$executeRaw`
      INSERT INTO "Contract" ("contractId", type, "issuerId", "issuerCorporationId", "forCorporation", title,
        "dateIssued", "dateExpired", "daysToComplete", volume, "startLocationId", "endLocationId", "regionId",
        "solarSystemId", "stationId", price, reward, collateral, buyout, "firstSeenAt", "lastSeenAt",
        "isDeleted", "createdAt", "updatedAt")
      SELECT id, t::"ContractType", iss, corp, fc, title, issued AT TIME ZONE 'UTC', expired AT TIME ZONE 'UTC',
        days, vol, sl, el, reg, sys, st, price, reward, coll, buyout, seen AT TIME ZONE 'UTC',
        seen AT TIME ZONE 'UTC', false, now(), now()
      FROM unnest(
        ${c.map((r) => r.contractId)}::int[], ${c.map((r) => r.type)}::text[],
        ${c.map((r) => r.issuerId)}::int[], ${c.map((r) => r.issuerCorporationId)}::int[],
        ${c.map((r) => r.forCorporation)}::bool[], ${c.map((r) => r.title)}::text[],
        ${c.map((r) => iso(r.dateIssued))}::timestamptz[], ${c.map((r) => iso(r.dateExpired))}::timestamptz[],
        ${c.map((r) => r.daysToComplete)}::int[], ${c.map((r) => r.volume)}::float8[],
        ${c.map((r) => r.startLocationId?.toString() ?? null)}::int8[],
        ${c.map((r) => r.endLocationId?.toString() ?? null)}::int8[],
        ${c.map((r) => r.regionId)}::int[], ${c.map((r) => r.solarSystemId)}::int[],
        ${c.map((r) => r.stationId)}::int[], ${c.map((r) => r.price)}::float8[],
        ${c.map((r) => r.reward)}::float8[], ${c.map((r) => r.collateral)}::float8[],
        ${c.map((r) => r.buyout)}::float8[], ${c.map((r) => iso(r.seenAt))}::timestamptz[]
      ) AS v(id, t, iss, corp, fc, title, issued, expired, days, vol, sl, el, reg, sys, st, price, reward,
        coll, buyout, seen)
      ON CONFLICT ("contractId") DO NOTHING`;
  }
};

interface FetchedItems {
  contractId: number;
  items: ContractsPublicItemsContractIdGet;
}

interface FetchedDynamicItem {
  itemId: number;
  data: DogmaDynamicItemsTypeIdItemIdGet;
}

/**
 * Items for contracts that have none yet, and the dogma of any mutated item
 * not already stored. A contract is written whole or not at all: if a
 * dynamic item's fetch fails transiently, the contract stays queued.
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

  // Contracts the snapshot ingest (or an earlier attempt) already filled.
  const stored = await prisma.$queryRaw<{ contractId: number }[]>`
    SELECT DISTINCT "contractId" FROM "ContractItem" WHERE "contractId" = ANY(${due}::int[])`;
  for (const { contractId } of stored) delete state.itemsPending[contractId];
  stats.alreadyStored = stored.length;
  const storedIds = new Set(stored.map((s) => s.contractId));

  const fetched: FetchedItems[] = [];
  const defer = (contractId: number) => {
    state.itemsPending[contractId] = now + ITEMS_RETRY_AFTER_MS;
  };
  await Promise.all(
    due
      .filter((id) => !storedIds.has(id))
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

  // Mutated items: fetch the dogma of those not stored yet.
  const [dynamicTypes, mappings] = await Promise.all([
    prisma.type.findMany({
      select: { typeId: true },
      where: { isDynamicType: true },
    }),
    prisma.dynamicItemAttributeMapping.findMany({
      select: { resultingTypeId: true },
      distinct: ["resultingTypeId"],
    }),
  ]);
  const dynamicTypeIds = new Set([
    ...dynamicTypes.map((t) => t.typeId),
    ...mappings.map((m) => m.resultingTypeId),
  ]);
  const mutated = fetched.flatMap(({ contractId, items }) =>
    items.flatMap((i) =>
      i.item_id != null && dynamicTypeIds.has(i.type_id)
        ? [{ contractId, itemId: i.item_id, typeId: i.type_id }]
        : [],
    ),
  );
  const mutatedByContract = new Map<number, number[]>();
  for (const m of mutated) {
    mutatedByContract.set(m.contractId, [
      ...(mutatedByContract.get(m.contractId) ?? []),
      m.itemId,
    ]);
  }
  const knownDynamic = new Set(
    (
      await prisma.dynamicItem.findMany({
        select: { itemId: true },
        where: { itemId: { in: mutated.map((m) => BigInt(m.itemId)) } },
      })
    ).map((d) => Number(d.itemId)),
  );
  const dynamic = new Map<number, FetchedDynamicItem>();
  /** 404: no such mutated item; its contract is stored without the link. */
  const notFound = new Set<number>();
  /** Failed transiently: its contract stays queued as it is. */
  const dynamicFailed = new Set<number>();
  /** Refused (400 and the like): our request is wrong, so don't store half. */
  const dynamicRejected = new Set<number>();
  await Promise.all(
    [...new Map(mutated.map((m) => [m.itemId, m])).values()]
      .filter((m) => !knownDynamic.has(m.itemId))
      .map(async ({ itemId, typeId }) => {
        const res = await gate.request<DogmaDynamicItemsTypeIdItemIdGet>(
          (signal) =>
            // Kubb orders path parameters alphabetically: item, then type.
            getDogmaDynamicItemsTypeIdItemId(itemId, typeId, undefined, {
              signal,
              userAgent: ESI_USER_AGENT,
            }),
        );
        if (res.ok) dynamic.set(itemId, { itemId, data: res.data });
        else if (res.status === 404) notFound.add(itemId);
        else if (res.transient) dynamicFailed.add(itemId);
        else dynamicRejected.add(itemId);
      }),
  );
  stats.dynamicFetched = dynamic.size;
  stats.dynamicNotFound = notFound.size;

  // Foreign keys from the SDE: a contract naming a type or dogma we lack
  // is set aside, not stored half.
  const dyn = [...dynamic.values()];
  const [types, attributes, effects] = await Promise.all([
    prisma.type.findMany({
      select: { typeId: true },
      where: {
        typeId: {
          in: [
            ...new Set([
              ...fetched.flatMap((f) => f.items.map((i) => i.type_id)),
              ...dyn.flatMap((d) => [
                d.data.source_type_id,
                d.data.mutator_type_id,
              ]),
            ]),
          ],
        },
      },
    }),
    prisma.dogmaAttribute.findMany({
      select: { attributeId: true },
      where: {
        attributeId: {
          in: [
            ...new Set(
              dyn.flatMap((d) =>
                d.data.dogma_attributes.map((a) => a.attribute_id),
              ),
            ),
          ],
        },
      },
    }),
    prisma.dogmaEffect.findMany({
      select: { effectId: true },
      where: {
        effectId: {
          in: [
            ...new Set(
              dyn.flatMap((d) => d.data.dogma_effects.map((e) => e.effect_id)),
            ),
          ],
        },
      },
    }),
  ]);
  const knownTypes = new Set(types.map((t) => t.typeId));
  const knownAttributes = new Set(attributes.map((a) => a.attributeId));
  const knownEffects = new Set(effects.map((e) => e.effectId));
  const dynamicOk = (d: FetchedDynamicItem) =>
    knownTypes.has(d.data.source_type_id) &&
    knownTypes.has(d.data.mutator_type_id) &&
    d.data.dogma_attributes.every((a) => knownAttributes.has(a.attribute_id)) &&
    d.data.dogma_effects.every((e) => knownEffects.has(e.effect_id));

  const writable: FetchedItems[] = [];
  for (const f of fetched) {
    const mine = mutatedByContract.get(f.contractId) ?? [];
    if (mine.some((id) => dynamicFailed.has(id))) {
      stats.transient++;
      continue;
    }
    const blocked =
      f.items.some((i) => !knownTypes.has(i.type_id)) ||
      mine.some((id) => dynamicRejected.has(id)) ||
      mine.some((id) => {
        const d = dynamic.get(id);
        return d !== undefined && !dynamicOk(d);
      });
    if (blocked) {
      stats.blocked++;
      logger.warn(
        "Contract items not stored: unknown type or dogma, or ESI refused a mutated item",
        {
          contractId: f.contractId,
        },
      );
      defer(f.contractId);
      continue;
    }
    writable.push(f);
  }
  if (writable.length === 0) return stats;

  const writableIds = new Set(writable.map((w) => w.contractId));
  const links = mutated.filter(
    (m) =>
      writableIds.has(m.contractId) &&
      (knownDynamic.has(m.itemId) || dynamic.has(m.itemId)),
  );
  const newDynamic = [...new Set(links.map((l) => l.itemId))].flatMap((id) => {
    const d = dynamic.get(id);
    return d ? [d] : [];
  });
  await ensureReferences({
    characterIds: newDynamic.map((d) => d.data.created_by),
  });

  const items = writable.flatMap((w) =>
    w.items.map((i) => ({ contractId: w.contractId, ...i })),
  );
  const attrs = newDynamic.flatMap((d) =>
    d.data.dogma_attributes.map((a) => ({ itemId: d.itemId, ...a })),
  );
  const effs = newDynamic.flatMap((d) =>
    d.data.dogma_effects.map((e) => ({ itemId: d.itemId, ...e })),
  );
  await prisma.$transaction(
    async (tx) => {
      for (const c of chunks(items)) {
        await tx.$executeRaw`
          INSERT INTO "ContractItem" ("contractId", "recordId", "typeId", quantity, "isIncluded", "itemId",
            "isBlueprintCopy", "materialEfficiency", "timeEfficiency", runs, "createdAt", "updatedAt")
          SELECT *, now(), now() FROM unnest(
            ${c.map((i) => i.contractId)}::int[], ${c.map((i) => String(i.record_id))}::int8[],
            ${c.map((i) => i.type_id)}::int[], ${c.map((i) => i.quantity)}::int[],
            ${c.map((i) => i.is_included)}::bool[],
            ${c.map((i) => (i.item_id == null ? null : String(i.item_id)))}::int8[],
            ${c.map((i) => i.is_blueprint_copy ?? null)}::bool[],
            ${c.map((i) => i.material_efficiency ?? null)}::int[],
            ${c.map((i) => i.time_efficiency ?? null)}::int[], ${c.map((i) => i.runs ?? null)}::int[])
          ON CONFLICT DO NOTHING`;
      }
      if (newDynamic.length > 0) {
        await tx.$executeRaw`
          INSERT INTO "DynamicItem" ("itemId", "sourceTypeId", "mutatorTypeId", "createdById", "createdAt", "updatedAt")
          SELECT *, now(), now() FROM unnest(
            ${newDynamic.map((d) => String(d.itemId))}::int8[],
            ${newDynamic.map((d) => d.data.source_type_id)}::int[],
            ${newDynamic.map((d) => d.data.mutator_type_id)}::int[],
            ${newDynamic.map((d) => d.data.created_by)}::int[])
          ON CONFLICT DO NOTHING`;
      }
      for (const c of chunks(attrs)) {
        await tx.$executeRaw`
          INSERT INTO "DynamicItemDogmaAttribute" ("itemId", "attributeId", value)
          SELECT * FROM unnest(${c.map((a) => String(a.itemId))}::int8[],
            ${c.map((a) => a.attribute_id)}::int[], ${c.map((a) => a.value)}::float8[])
          ON CONFLICT DO NOTHING`;
      }
      for (const c of chunks(effs)) {
        await tx.$executeRaw`
          INSERT INTO "DynamicItemDogmaEffect" ("itemId", "effectId", "isDefault")
          SELECT * FROM unnest(${c.map((e) => String(e.itemId))}::int8[],
            ${c.map((e) => e.effect_id)}::int[], ${c.map((e) => e.is_default)}::bool[])
          ON CONFLICT DO NOTHING`;
      }
      for (const c of chunks(links)) {
        await tx.$executeRaw`
          INSERT INTO "ContractDynamicItem" ("contractId", "itemId")
          SELECT * FROM unnest(${c.map((l) => l.contractId)}::int[],
            ${c.map((l) => String(l.itemId))}::int8[])
          ON CONFLICT DO NOTHING`;
      }
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
  for (const id of writableIds) delete state.itemsPending[id];
  stats.written = writable.length;
  stats.items = items.length;
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
  const bids: {
    contractId: number;
    bidId: number;
    amount: number;
    dateBid: string;
  }[] = [];
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
  // Bids never change, so one already stored is left alone.
  for (const c of chunks(bids)) {
    await prisma.$executeRaw`
      INSERT INTO "ContractBid" ("bidId", "contractId", amount, "dateBid", "createdAt", "updatedAt")
      SELECT id, contract, amount, bid AT TIME ZONE 'UTC', now(), now() FROM unnest(
        ${c.map((b) => b.bidId)}::int[], ${c.map((b) => b.contractId)}::int[],
        ${c.map((b) => b.amount)}::float8[], ${c.map((b) => b.dateBid)}::timestamptz[])
        AS v(id, contract, amount, bid)
      ON CONFLICT ("bidId") DO NOTHING`;
  }
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
  // Every write is idempotent and the timeline ignores a listing it has
  // already applied, so a retry repeats only what had not landed.
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
    const listings = await Promise.all(
      regionIds.map((id) => fetchRegionListing(gate, id)),
    );
    const observed = listings.filter((l) => l.ok);
    const failedRegions = listings.filter((l) => !l.ok);
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

    const outstandingRows = await prisma.contract.findMany({
      select: {
        contractId: true,
        regionId: true,
        type: true,
        dateIssued: true,
        dateExpired: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
      where: { isDeleted: false },
    });
    const outstanding = outstandingRows.map((c) => ({
      contractId: c.contractId,
      regionId: c.regionId,
      dateExpired: c.dateExpired.getTime(),
      lastSeenAt: (c.lastSeenAt ?? c.firstSeenAt ?? c.dateIssued).getTime(),
    }));
    const outstandingIds = new Set(outstanding.map((c) => c.contractId));

    const stored = await loadState();
    let state: SyncState;
    if (stored) {
      state = stored;
    } else {
      // First run (or the state was lost): learn region sizes from the
      // database, and queue outstanding contracts that have no items yet.
      ctx.logger.info("No sync state on record; starting from the database");
      const withItems = outstandingRows.filter((c) =>
        TYPES_WITH_ITEMS.has(c.type),
      );
      const itemless = await prisma.$queryRaw<{ id: number }[]>`
        SELECT c.id FROM unnest(${withItems.map((c) => c.contractId)}::int[]) AS c(id)
        WHERE NOT EXISTS (SELECT 1 FROM "ContractItem" i WHERE i."contractId" = c.id)`;
      state = {
        ...seedRegionHistories(emptyTimelineState(), outstanding),
        itemsPending: Object.fromEntries(itemless.map((c) => [c.id, 0])),
      };
    }

    const plan = planContractTimeline({
      state,
      outstanding,
      observations: observed.map((l) => ({
        regionId: l.regionId,
        observedAt: l.observedAt,
        contractIds: new Set(l.contracts.map((c) => c.contract_id)),
      })),
      now,
    });

    // Listed but not outstanding: new, or reappeared.
    const listedById = new Map(
      observed.flatMap((l) =>
        l.contracts.map(
          (c) =>
            [c.contract_id, { contract: c, regionId: l.regionId }] as const,
        ),
      ),
    );
    const candidates = [...plan.seen.keys()].filter(
      (id) => !outstandingIds.has(id),
    );
    const known = await prisma.contract.findMany({
      select: { contractId: true, isDeleted: true, type: true },
      where: { contractId: { in: candidates } },
    });
    const knownIds = new Set(known.map((c) => c.contractId));
    const reopened = known.flatMap((c) => {
      const seenAt = plan.seen.get(c.contractId);
      return c.isDeleted && seenAt !== undefined ? [{ ...c, seenAt }] : [];
    });
    const fresh = candidates.flatMap((id) => {
      const listed = listedById.get(id);
      const seenAt = plan.seen.get(id);
      return !knownIds.has(id) && listed && seenAt !== undefined
        ? [{ ...listed, seenAt }]
        : [];
    });

    await ensureReferences({
      characterIds: fresh.map((f) => f.contract.issuer_id),
      corporationIds: fresh.map((f) => f.contract.issuer_corporation_id),
      stationIds: fresh
        .map((f) => npcStationOf(f.contract))
        .filter((id): id is number => id != null),
    });
    const stations = await prisma.station.findMany({
      select: { stationId: true, solarSystemId: true },
      where: {
        stationId: {
          in: [
            ...new Set(
              fresh
                .map((f) => npcStationOf(f.contract))
                .filter((id): id is number => id != null),
            ),
          ],
        },
      },
    });
    const stationSystems = new Map(
      stations.map((s) => [s.stationId, s.solarSystemId]),
    );
    const rows = fresh.map((f) =>
      contractRowFromEsi(f.contract, f.regionId, f.seenAt, stationSystems),
    );

    await prisma.$transaction(
      async (tx) => {
        await insertContracts(tx, rows);
        if (reopened.length > 0) {
          await tx.$executeRaw`
            UPDATE "Contract" c SET "isDeleted" = false, "endReason" = NULL,
              "lastSeenAt" = v.seen AT TIME ZONE 'UTC', "updatedAt" = now()
            FROM unnest(${reopened.map((r) => r.contractId)}::int[],
              ${reopened.map((r) => iso(r.seenAt))}::timestamptz[]) AS v(id, seen)
            WHERE c."contractId" = v.id AND c."isDeleted" = true`;
        }
        for (const c of chunks(plan.ended)) {
          // Guarded on isDeleted, so a retry that ends them again changes nothing.
          await tx.$executeRaw`
            UPDATE "Contract" c SET "isDeleted" = true, "lastSeenAt" = v.seen AT TIME ZONE 'UTC',
              "endReason" = v.reason::"ContractEndReason", "updatedAt" = now()
            FROM unnest(${c.map((e) => e.contractId)}::int[],
              ${c.map((e) => iso(e.lastSeen))}::timestamptz[],
              ${c.map((e) => e.reason)}::text[]) AS v(id, seen, reason)
            WHERE c."contractId" = v.id AND c."isDeleted" = false`;
        }
      },
      { timeout: 120_000, maxWait: 30_000 },
    );

    // Daily: lastSeenAt for everything still outstanding.
    for (const c of chunks(plan.checkpoint ?? [], 20_000)) {
      await prisma.$executeRaw`
        UPDATE "Contract" c SET "lastSeenAt" = v.seen AT TIME ZONE 'UTC'
        FROM unnest(${c.map((x) => x.contractId)}::int[],
          ${c.map((x) => iso(x.lastSeen))}::timestamptz[]) AS v(id, seen)
        WHERE c."contractId" = v.id AND c."isDeleted" = false
          AND (c."lastSeenAt" IS NULL OR c."lastSeenAt" < v.seen AT TIME ZONE 'UTC')`;
    }

    // Queue items for the new and reopened contracts that list them, and
    // drop queued contracts that are no longer outstanding.
    const endedIds = new Set(plan.ended.map((e) => e.contractId));
    const live = new Set(
      [
        ...outstandingIds,
        ...rows.map((r) => r.contractId),
        ...reopened.map((r) => r.contractId),
      ].filter((id) => !endedIds.has(id)),
    );
    const itemsPending = Object.fromEntries(
      Object.entries(state.itemsPending).filter(([id]) => live.has(Number(id))),
    );
    for (const r of [...rows, ...reopened]) {
      if (
        TYPES_WITH_ITEMS.has(r.type) &&
        !Object.hasOwn(itemsPending, r.contractId)
      ) {
        itemsPending[r.contractId] = 0;
      }
    }
    const next: SyncState = { ...plan.state, itemsPending };
    // Saved before items and bids: the timeline above is what must not be
    // applied twice; those two re-check the database on a retry.
    await saveState(next);

    const allListed = listings.flatMap((l) => (l.ok ? l.contracts : []));
    const listed = new Map(
      allListed.map((c) => [
        c.contract_id,
        { dateExpired: Date.parse(c.date_expired) },
      ]),
    );
    const items = await syncItems({
      gate,
      state: next,
      listed,
      now,
      logger: ctx.logger,
    });
    await saveState(next);

    const newIds = new Set([
      ...rows.map((r) => r.contractId),
      ...reopened.map((r) => r.contractId),
    ]);
    const auctions = allListed
      .filter(
        (c) =>
          TYPES_WITH_BIDS.has(contractTypeOf(c)) && live.has(c.contract_id),
      )
      .map((c) => ({
        contractId: c.contract_id,
        dateExpired: Date.parse(c.date_expired),
      }));
    const bids = await syncBids({
      gate,
      contractIds: selectAuctionsForBids(auctions, newIds, now),
    });

    const endReasons: Record<string, number> = {};
    for (const e of plan.ended) {
      const key = e.reason ?? "unknown";
      endReasons[key] = (endReasons[key] ?? 0) + 1;
    }
    return {
      stats: {
        regions: regionIds.length,
        observed: observed.length,
        failedRegions: failedRegions.map((f) => f.regionId),
        unchangedRegions: plan.unchangedRegions.length,
        incompleteRegions: plan.incompleteRegions,
        listed: allListed.length,
        outstandingBefore: outstanding.length,
        inserted: rows.length,
        reopened: reopened.length,
        ended: plan.ended.length,
        endReasons,
        missing: Object.keys(next.missing).length,
        checkpointed: plan.checkpoint?.length ?? 0,
        items,
        bids,
        esi: gate.stats,
      },
    };
  },
});

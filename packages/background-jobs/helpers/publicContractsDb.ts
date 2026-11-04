/**
 * Database writes for public contracts' references, items, mutated items and
 * bids. All of them are inserts of things that never change, with ON CONFLICT
 * DO NOTHING, written as the EVE Ref snapshot import wrote them: running them
 * again, or over rows that import left, adds nothing twice. The timeline itself
 * is `contractTimelineStore.ts`'s.
 */
import type {
  ContractsPublicItemsContractIdGet,
  DogmaDynamicItemsTypeIdItemIdGet,
} from "@jitaspace/esi-client";

import { prisma } from "../db";
import { createCorpAndItsRefRecords } from "./createCorpAndItsRefs";

const CHUNK = 5000;
const chunks = <T>(xs: readonly T[], size = CHUNK) => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

/**
 * Store whichever issuers, issuer corporations, creators and NPC stations the
 * database lacks, so the rows written next keep their foreign keys. Checked
 * here first: the helper logs its whole status on every call.
 * @returns how many were missing.
 */
export const ensureReferences = async ({
  characterIds = [],
  corporationIds = [],
  stationIds = [],
}: {
  characterIds?: number[];
  corporationIds?: number[];
  stationIds?: number[];
}) => {
  const [characters, corporations, stations] = [
    [...new Set(characterIds)],
    [...new Set(corporationIds)],
    [...new Set(stationIds)],
  ];
  const have = {
    characters: new Set(
      (
        await prisma.character.findMany({
          select: { characterId: true },
          where: { characterId: { in: characters } },
        })
      ).map((c) => c.characterId),
    ),
    corporations: new Set(
      (
        await prisma.corporation.findMany({
          select: { corporationId: true },
          where: { corporationId: { in: corporations } },
        })
      ).map((c) => c.corporationId),
    ),
    stations: new Set(
      (
        await prisma.station.findMany({
          select: { stationId: true },
          where: { stationId: { in: stations } },
        })
      ).map((s) => s.stationId),
    ),
  };
  const missing = {
    missingCharacterIds: new Set(
      characters.filter((id) => !have.characters.has(id)),
    ),
    missingCorporationIds: new Set(
      corporations.filter((id) => !have.corporations.has(id)),
    ),
    missingStationIds: new Set(stations.filter((id) => !have.stations.has(id))),
  };
  const count =
    missing.missingCharacterIds.size +
    missing.missingCorporationIds.size +
    missing.missingStationIds.size;
  if (count > 0) await createCorpAndItsRefRecords(missing);
  return count;
};

/** NPC station ID → its solar system, for the stations given. */
export const stationSystemsOf = async (stationIds: readonly number[]) =>
  new Map(
    (
      await prisma.station.findMany({
        select: { stationId: true, solarSystemId: true },
        where: { stationId: { in: [...new Set(stationIds)] } },
      })
    ).map((s) => [s.stationId, s.solarSystemId]),
  );

/** IDs of contracts the database already stores, among those given. */
export const storedContractIdsOf = async (contractIds: readonly number[]) =>
  new Set(
    (
      await prisma.$queryRaw<{ id: number }[]>`
        SELECT "contractId" id FROM "Contract" WHERE "contractId" = ANY(${[...contractIds]}::int[])`
    ).map((r) => r.id),
  );

/** IDs of contracts that have items stored, among those given. */
export const contractsWithItemsOf = async (contractIds: readonly number[]) =>
  new Set(
    (
      await prisma.$queryRaw<{ id: number }[]>`
        SELECT DISTINCT "contractId" id FROM "ContractItem" WHERE "contractId" = ANY(${[...contractIds]}::int[])`
    ).map((r) => r.id),
  );

/**
 * IDs of outstanding contracts with no items stored, among those given (one
 * index probe each).
 */
export const itemlessContractsOf = async (contractIds: readonly number[]) =>
  contractIds.length === 0
    ? []
    : (
        await prisma.$queryRaw<{ id: number }[]>`
          SELECT c."contractId" id FROM unnest(${[...contractIds]}::int[]) AS v(id)
          JOIN "Contract" c ON c."contractId" = v.id AND c."isDeleted" = false
          WHERE NOT EXISTS (SELECT 1 FROM "ContractItem" i WHERE i."contractId" = v.id)`
      ).map((r) => r.id);

export type ContractItemRow = ContractsPublicItemsContractIdGet[number];
export type DynamicItemData = DogmaDynamicItemsTypeIdItemIdGet;

/** One contract's items, as ESI lists them. */
export interface ContractItems {
  contractId: number;
  items: ContractItemRow[];
}

/**
 * The mutated items among these contracts' items (types whose instances are
 * dynamic, per the SDE), and which of them DynamicItem already holds. A
 * mutated item's rolls never change, so those need no fetch.
 */
export const mutatedItemsOf = async (contracts: readonly ContractItems[]) => {
  const [types, mappings] = [
    await prisma.type.findMany({
      select: { typeId: true },
      where: { isDynamicType: true },
    }),
    await prisma.dynamicItemAttributeMapping.findMany({
      select: { resultingTypeId: true },
      distinct: ["resultingTypeId"],
    }),
  ];
  const dynamicTypes = new Set([
    ...types.map((t) => t.typeId),
    ...mappings.map((m) => m.resultingTypeId),
  ]);
  const mutated = contracts.flatMap(({ contractId, items }) =>
    items.flatMap((i) =>
      i.item_id != null && dynamicTypes.has(i.type_id)
        ? [{ contractId, itemId: i.item_id, typeId: i.type_id }]
        : [],
    ),
  );
  const known = new Set(
    (
      await prisma.dynamicItem.findMany({
        select: { itemId: true },
        where: { itemId: { in: mutated.map((m) => BigInt(m.itemId)) } },
      })
    ).map((d) => Number(d.itemId)),
  );
  return { mutated, known };
};

/**
 * Store contracts' items, the mutated ones' dogma and their links, in one
 * transaction. A contract is stored whole or not at all: one naming a type or
 * dogma the SDE ingest has not stored yet is returned as `blocked`. A mutated
 * item whose dogma is neither stored nor in `dynamic` is stored without its
 * link (ESI no longer knows it).
 */
export const writeContractItems = async ({
  contracts,
  dynamic,
  mutated,
  known,
}: {
  contracts: readonly ContractItems[];
  dynamic: ReadonlyMap<number, DynamicItemData>;
  mutated: readonly { contractId: number; itemId: number }[];
  known: ReadonlySet<number>;
}): Promise<{ written: number[]; blocked: number[] }> => {
  if (contracts.length === 0) return { written: [], blocked: [] };
  const dyn = [...dynamic.entries()];
  const [types, attributes, effects] = [
    await prisma.type.findMany({
      select: { typeId: true },
      where: {
        typeId: {
          in: [
            ...new Set([
              ...contracts.flatMap((c) => c.items.map((i) => i.type_id)),
              ...dyn.flatMap(([, d]) => [d.source_type_id, d.mutator_type_id]),
            ]),
          ],
        },
      },
    }),
    await prisma.dogmaAttribute.findMany({
      select: { attributeId: true },
      where: {
        attributeId: {
          in: [
            ...new Set(
              dyn.flatMap(([, d]) =>
                d.dogma_attributes.map((a) => a.attribute_id),
              ),
            ),
          ],
        },
      },
    }),
    await prisma.dogmaEffect.findMany({
      select: { effectId: true },
      where: {
        effectId: {
          in: [
            ...new Set(
              dyn.flatMap(([, d]) => d.dogma_effects.map((e) => e.effect_id)),
            ),
          ],
        },
      },
    }),
  ];
  const knownTypes = new Set(types.map((t) => t.typeId));
  const knownAttributes = new Set(attributes.map((a) => a.attributeId));
  const knownEffects = new Set(effects.map((e) => e.effectId));
  const dynamicOk = (d: DynamicItemData) =>
    knownTypes.has(d.source_type_id) &&
    knownTypes.has(d.mutator_type_id) &&
    d.dogma_attributes.every((a) => knownAttributes.has(a.attribute_id)) &&
    d.dogma_effects.every((e) => knownEffects.has(e.effect_id));

  const mutatedByContract = new Map<number, number[]>();
  for (const m of mutated) {
    const list = mutatedByContract.get(m.contractId);
    if (list) list.push(m.itemId);
    else mutatedByContract.set(m.contractId, [m.itemId]);
  }
  const blocked: number[] = [];
  const writable = contracts.filter((c) => {
    const ok =
      c.items.every((i) => knownTypes.has(i.type_id)) &&
      (mutatedByContract.get(c.contractId) ?? []).every((id) => {
        const d = dynamic.get(id);
        return d === undefined || dynamicOk(d);
      });
    if (!ok) blocked.push(c.contractId);
    return ok;
  });
  if (writable.length === 0) return { written: [], blocked };

  const writableIds = new Set(writable.map((w) => w.contractId));
  const links = mutated.filter(
    (m) =>
      writableIds.has(m.contractId) &&
      (known.has(m.itemId) || dynamic.has(m.itemId)),
  );
  const newDynamic = [...new Set(links.map((l) => l.itemId))].flatMap((id) => {
    const d = known.has(id) ? undefined : dynamic.get(id);
    return d ? [{ itemId: id, data: d }] : [];
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
    { timeout: 120_000, maxWait: 60_000 },
  );
  return { written: [...writableIds], blocked };
};

export interface ContractBid {
  contractId: number;
  bidId: number;
  amount: number;
  /** ISO 8601. */
  dateBid: string;
}

/** Store bids on stored contracts. Bids never change. */
export const writeContractBids = async (bids: readonly ContractBid[]) => {
  for (const c of chunks(bids)) {
    await prisma.$executeRaw`
      INSERT INTO "ContractBid" ("bidId", "contractId", amount, "dateBid", "createdAt", "updatedAt")
      SELECT id, contract, amount, bid AT TIME ZONE 'UTC', now(), now() FROM unnest(
        ${c.map((b) => b.bidId)}::int[], ${c.map((b) => b.contractId)}::int[],
        ${c.map((b) => b.amount)}::float8[], ${c.map((b) => b.dateBid)}::timestamptz[])
        AS v(id, contract, amount, bid)
      ON CONFLICT ("bidId") DO NOTHING`;
  }
};

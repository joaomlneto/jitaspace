import type { EntityNames } from "~/lib/history";
import { prisma } from "~/lib/db";

/**
 * Server-side, batched display names for the entities a change-history view
 * lists.
 *
 * The build page renders every entity a build touched — thousands of rows on a
 * big patch. Resolving those names in the client meant one server action per
 * entity (`resolveTypeLabel` via `<TypeName>`), so the list rendered as `#587`
 * placeholders and filled in over hundreds of round-trips; every kind other than
 * `type` never got a name at all. Here the whole page's names are resolved in
 * one pass — a single query per entity kind — and shipped with the changes.
 *
 * The per-id `resolve*Label` actions in `app/history/actions.ts` stay: they back
 * the breadcrumbs, which walk a chain (type → group → category) whose next id is
 * only known once the current one resolves, so they genuinely can't be batched.
 */

/** `IN (…)` batch size. A single build can touch far more entities than it is
 * wise to bind into one statement, so long id lists are chunked. */
const CHUNK = 1_000;

const chunked = (ids: number[]): number[][] => {
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(ids.slice(i, i + CHUNK));
  return out;
};

/**
 * Pairs up rows into `[id, name]`, dropping anything whose name is missing or
 * blank — several SDE names are present but empty, and an empty label reads as a
 * bug rather than as "unknown".
 */
function collect<R>(
  rows: readonly R[],
  id: (row: R) => number,
  name: (row: R) => string | null | undefined,
): [number, string][] {
  return rows.flatMap((row) => {
    const text = name(row)?.trim();
    return text ? [[id(row), text] as [number, string]] : [];
  });
}

/** First value with visible text — mirrors `app/history/actions.ts`. */
const firstNonEmpty = (
  ...values: (string | null | undefined)[]
): string | undefined =>
  values.map((v) => v?.trim()).find((v) => v !== undefined && v !== "");

type Loader = (ids: number[]) => Promise<[number, string][]>;

/**
 * How to name each entity kind, keyed by the `kind` the history database stores
 * (see `PRIMARY_COLLECTION` in the build page's `_entity-sections.tsx`).
 *
 * Written out per kind rather than derived from a table of field names: Prisma's
 * delegates are separately typed, so a generic version needs casts that would
 * defeat the `no-unsafe-*` lint rules and the type checking that catches a
 * renamed column here.
 *
 * Two kinds are deliberately absent, because our schema genuinely cannot name
 * them: `graphic` and `icon` carry only `res:/…` asset paths, and a raw path
 * reads worse in a change list than the kind plus its id. They keep their `#id`
 * label.
 */
const LOADERS: Record<string, Loader> = {
  type: async (ids) =>
    collect(
      await prisma.type.findMany({
        where: { typeId: { in: ids } },
        select: { typeId: true, name: true },
      }),
      (r) => r.typeId,
      (r) => r.name,
    ),
  category: async (ids) =>
    collect(
      await prisma.category.findMany({
        where: { categoryId: { in: ids } },
        select: { categoryId: true, name: true },
      }),
      (r) => r.categoryId,
      (r) => r.name,
    ),
  group: async (ids) =>
    collect(
      await prisma.group.findMany({
        where: { groupId: { in: ids } },
        select: { groupId: true, name: true },
      }),
      (r) => r.groupId,
      (r) => r.name,
    ),
  marketGroup: async (ids) =>
    collect(
      await prisma.marketGroup.findMany({
        where: { marketGroupId: { in: ids } },
        select: { marketGroupId: true, name: true },
      }),
      (r) => r.marketGroupId,
      (r) => r.name,
    ),
  metaGroup: async (ids) =>
    collect(
      await prisma.metaGroup.findMany({
        where: { metaGroupId: { in: ids } },
        select: { metaGroupId: true, name: true },
      }),
      (r) => r.metaGroupId,
      (r) => r.name,
    ),
  // Dogma attributes and effects prefer the player-facing `displayName`, as the
  // breadcrumb labels do; `name` is the internal identifier.
  dogmaAttribute: async (ids) =>
    collect(
      await prisma.dogmaAttribute.findMany({
        where: { attributeId: { in: ids } },
        select: { attributeId: true, displayName: true, name: true },
      }),
      (r) => r.attributeId,
      (r) => firstNonEmpty(r.displayName, r.name),
    ),
  dogmaAttributeCategory: async (ids) =>
    collect(
      await prisma.dogmaAttributeCategory.findMany({
        where: { attributeCategoryId: { in: ids } },
        select: { attributeCategoryId: true, name: true },
      }),
      (r) => r.attributeCategoryId,
      (r) => r.name,
    ),
  dogmaEffect: async (ids) =>
    collect(
      await prisma.dogmaEffect.findMany({
        where: { effectId: { in: ids } },
        select: { effectId: true, displayName: true, name: true },
      }),
      (r) => r.effectId,
      (r) => firstNonEmpty(r.displayName, r.name),
    ),
  // `displayName` is frequently null — the SDE ships it as a numeric message id
  // that the ingest cannot localize — so fall back to the always-present
  // internal `operationName`.
  dbuffCollection: async (ids) =>
    collect(
      await prisma.dbuffCollection.findMany({
        where: { dbuffCollectionId: { in: ids } },
        select: {
          dbuffCollectionId: true,
          displayName: true,
          operationName: true,
        },
      }),
      (r) => r.dbuffCollectionId,
      (r) => firstNonEmpty(r.displayName, r.operationName),
    ),
  faction: async (ids) =>
    collect(
      await prisma.faction.findMany({
        where: { factionId: { in: ids } },
        select: { factionId: true, name: true },
      }),
      (r) => r.factionId,
      (r) => r.name,
    ),
  race: async (ids) =>
    collect(
      await prisma.race.findMany({
        where: { raceId: { in: ids } },
        select: { raceId: true, name: true },
      }),
      (r) => r.raceId,
      (r) => r.name,
    ),
  bloodline: async (ids) =>
    collect(
      await prisma.bloodline.findMany({
        where: { bloodlineId: { in: ids } },
        select: { bloodlineId: true, name: true },
      }),
      (r) => r.bloodlineId,
      (r) => r.name,
    ),
  ancestry: async (ids) =>
    collect(
      await prisma.ancestry.findMany({
        where: { ancestryId: { in: ids } },
        select: { ancestryId: true, name: true },
      }),
      (r) => r.ancestryId,
      (r) => r.name,
    ),
  corporationActivity: async (ids) =>
    collect(
      await prisma.corporationActivity.findMany({
        where: { corporationActivityId: { in: ids } },
        select: { corporationActivityId: true, name: true },
      }),
      (r) => r.corporationActivityId,
      (r) => r.name,
    ),
  // NPC corporations and characters are ordinary rows in the shared
  // corporation/character tables, keyed by the same ids the SDE uses.
  npcCorporation: async (ids) =>
    collect(
      await prisma.corporation.findMany({
        where: { corporationId: { in: ids } },
        select: { corporationId: true, name: true },
      }),
      (r) => r.corporationId,
      (r) => r.name,
    ),
  npcCorporationDivision: async (ids) =>
    collect(
      await prisma.npcCorporationDivision.findMany({
        where: { npcCorporationDivisionId: { in: ids } },
        select: { npcCorporationDivisionId: true, name: true },
      }),
      (r) => r.npcCorporationDivisionId,
      (r) => r.name,
    ),
  npcCharacter: async (ids) =>
    collect(
      await prisma.character.findMany({
        where: { characterId: { in: ids } },
        select: { characterId: true, name: true },
      }),
      (r) => r.characterId,
      (r) => r.name,
    ),
  // An agent in space IS a character, keyed by that character's id.
  agentInSpace: async (ids) =>
    collect(
      await prisma.character.findMany({
        where: { characterId: { in: ids } },
        select: { characterId: true, name: true },
      }),
      (r) => r.characterId,
      (r) => r.name,
    ),
  // Planetary-industry schematics are the only integer-keyed `schematics`
  // dataset the client ships.
  schematic: async (ids) =>
    collect(
      await prisma.planetSchematic.findMany({
        where: { planetSchematicId: { in: ids } },
        select: { planetSchematicId: true, name: true },
      }),
      (r) => r.planetSchematicId,
      (r) => r.name,
    ),
  stationOperation: async (ids) =>
    collect(
      await prisma.stationOperation.findMany({
        where: { stationOperationId: { in: ids } },
        select: { stationOperationId: true, operationName: true },
      }),
      (r) => r.stationOperationId,
      (r) => r.operationName,
    ),
  stationService: async (ids) =>
    collect(
      await prisma.stationService.findMany({
        where: { stationServiceId: { in: ids } },
        select: { stationServiceId: true, name: true },
      }),
      (r) => r.stationServiceId,
      (r) => r.name,
    ),
  region: async (ids) =>
    collect(
      await prisma.region.findMany({
        where: { regionId: { in: ids } },
        select: { regionId: true, name: true },
      }),
      (r) => r.regionId,
      (r) => r.name,
    ),
  constellation: async (ids) =>
    collect(
      await prisma.constellation.findMany({
        where: { constellationId: { in: ids } },
        select: { constellationId: true, name: true },
      }),
      (r) => r.constellationId,
      (r) => r.name,
    ),
  solarSystem: async (ids) =>
    collect(
      await prisma.solarSystem.findMany({
        where: { solarSystemId: { in: ids } },
        select: { solarSystemId: true, name: true },
      }),
      (r) => r.solarSystemId,
      (r) => r.name,
    ),
  planet: async (ids) =>
    collect(
      await prisma.planet.findMany({
        where: { planetId: { in: ids } },
        select: { planetId: true, name: true },
      }),
      (r) => r.planetId,
      (r) => r.name,
    ),
  moon: async (ids) =>
    collect(
      await prisma.moon.findMany({
        where: { moonId: { in: ids } },
        select: { moonId: true, name: true },
      }),
      (r) => r.moonId,
      (r) => r.name,
    ),
  asteroidBelt: async (ids) =>
    collect(
      await prisma.asteroidBelt.findMany({
        where: { asteroidBeltId: { in: ids } },
        select: { asteroidBeltId: true, name: true },
      }),
      (r) => r.asteroidBeltId,
      (r) => r.name,
    ),
  npcStation: async (ids) =>
    collect(
      await prisma.station.findMany({
        where: { stationId: { in: ids } },
        select: { stationId: true, name: true },
      }),
      (r) => r.stationId,
      (r) => r.name,
    ),
  star: async (ids) =>
    collect(
      await prisma.star.findMany({
        where: { starId: { in: ids } },
        select: { starId: true, name: true },
      }),
      (r) => r.starId,
      (r) => r.name,
    ),
  stargate: async (ids) =>
    collect(
      await prisma.stargate.findMany({
        where: { stargateId: { in: ids } },
        select: { stargateId: true, name: true },
      }),
      (r) => r.stargateId,
      (r) => r.name,
    ),
  cloneGrade: async (ids) =>
    collect(
      await prisma.cloneGrade.findMany({
        where: { cloneGradeId: { in: ids } },
        select: { cloneGradeId: true, name: true },
      }),
      (r) => r.cloneGradeId,
      (r) => r.name,
    ),
  // SKINs have no player-facing name in the SDE — `internalName` is what the
  // rest of the app shows for them too.
  skin: async (ids) =>
    collect(
      await prisma.skin.findMany({
        where: { skinId: { in: ids } },
        select: { skinId: true, internalName: true },
      }),
      (r) => r.skinId,
      (r) => r.internalName,
    ),
  skinMaterial: async (ids) =>
    collect(
      await prisma.skinMaterial.findMany({
        where: { skinMaterialId: { in: ids } },
        select: { skinMaterialId: true, displayName: true },
      }),
      (r) => r.skinMaterialId,
      (r) => r.displayName,
    ),
};

/** An entity to name, plus whatever the history database recorded for it. */
export interface EntityNameRef {
  entityType: string;
  entityId: number;
  /** Name stored alongside the change, used when our SDE tables have none. */
  fallbackName?: string | null;
}

/**
 * Resolves display names for a page's worth of entities: one query per entity
 * kind (chunked), run concurrently, rather than one round-trip per entity.
 *
 * Names are decoration — the id is always rendered — so a kind whose lookup
 * fails is skipped rather than failing the page, matching how the per-id label
 * actions swallow their errors.
 */
export async function resolveEntityNames(
  refs: readonly EntityNameRef[],
): Promise<EntityNames> {
  const idsByKind = new Map<string, Set<number>>();
  const fallbacks: EntityNames = {};

  for (const { entityType, entityId, fallbackName } of refs) {
    if (!Number.isInteger(entityId)) continue;
    const ids = idsByKind.get(entityType) ?? new Set<number>();
    ids.add(entityId);
    idsByKind.set(entityType, ids);

    const text = fallbackName?.trim();
    if (text) (fallbacks[entityType] ??= {})[entityId] = text;
  }

  const resolved: EntityNames = {};
  await Promise.all(
    [...idsByKind].map(async ([kind, ids]) => {
      const load = LOADERS[kind];
      if (!load) return;
      try {
        const batches = await Promise.all(
          chunked([...ids]).map((batch) => load(batch)),
        );
        const pairs = batches.flat();
        if (pairs.length > 0) resolved[kind] = Object.fromEntries(pairs);
      } catch {
        // Unknown ids and unreachable tables both degrade to the `#id` label.
      }
    }),
  );

  // Our SDE tables win. The history database's own `Entity.name` is used only to
  // fill gaps — an entity newer than the ingested SDE, or one of the two kinds
  // we cannot name. Nothing in this repo writes that column (the history schema
  // belongs to an upstream ingestion pipeline), so it is opportunistic: correct
  // when present, and costing nothing when it is null, which is the assumption
  // the rest of this module is built on.
  const names: EntityNames = {};
  for (const kind of new Set([
    ...Object.keys(fallbacks),
    ...Object.keys(resolved),
  ])) {
    const merged = { ...fallbacks[kind], ...resolved[kind] };
    if (Object.keys(merged).length > 0) names[kind] = merged;
  }
  return names;
}

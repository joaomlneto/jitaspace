import { buildsDb, Prisma } from "@jitaspace/db-builds";

import type { EntityChangeRow, EntityNames } from "~/lib/history";
import { prisma } from "~/lib/db";
import { PRIMARY_COLLECTION } from "~/lib/history";
import { historyTable } from "~/lib/history-sql";

/**
 * Display names for every entity among `changes`, by kind and id, read on the
 * server so a change list arrives named: no row fetches its own (one server
 * action per row, which Next runs one at a time, took minutes on a large list).
 * A change without an `entityType` is a type, as the change lists group it.
 *
 * Every entity a build adds or changes has a name, so a row without one means a
 * lookup failed to find it. Three sources, in order:
 *
 * 1. Our database ({@link MAIN_DB_NAMES}), one query per kind on the page. It
 *    covers everything the last SDE ingest knew about, removed entities
 *    included (their rows are kept, flagged `isDeleted`).
 * 2. For the rest — above all whatever a fresh build adds, which the SDE does
 *    not have yet — the history database, as of `atBuild`
 *    ({@link readHistoryNames}).
 * 3. Then the name the history database stores on the entity
 *    ({@link readStoredNames}). It covers what the second source can't: a
 *    name the game never renamed has no string change to read it from, which
 *    left most mission dungeons unnamed.
 *
 * Without `atBuild` the history database isn't read.
 *
 * Throws on failure, so that inside a `"use cache"` scope an outage fails the
 * read instead of caching a day of missing names.
 */
export async function readEntityNames(
  changes: readonly Pick<EntityChangeRow, "entityId" | "entityType">[],
  atBuild?: number,
): Promise<EntityNames> {
  const idsByKind = new Map<string, Set<number>>();
  for (const c of changes) {
    const kind = c.entityType ?? "type";
    const ids = idsByKind.get(kind) ?? new Set<number>();
    ids.add(c.entityId);
    idsByKind.set(kind, ids);
  }

  const names: EntityNames = {};
  const set = (kind: string, id: number, name: string | null | undefined) => {
    const text = name?.trim();
    if (!text) return;
    (names[kind] ??= {})[id] = text;
  };

  await Promise.all(
    [...idsByKind].map(async ([kind, ids]) => {
      const lookup = MAIN_DB_NAMES[kind];
      if (!lookup) return;
      for (const [id, name] of await lookup([...ids])) set(kind, id, name);
    }),
  );

  const missing = [...idsByKind].flatMap(([kind, ids]) =>
    [...ids]
      .filter((id) => names[kind]?.[id] === undefined)
      .map((id) => ({ kind, id })),
  );
  if (atBuild === undefined || missing.length === 0) return names;
  for (const { kind, id, name } of await readHistoryNames(missing, atBuild))
    set(kind, id, name);

  const unnamed = missing.filter(
    ({ kind, id }) => names[kind]?.[id] === undefined,
  );
  for (const { kind, id, name } of await readStoredNames(unnamed))
    set(kind, id, name);
  return names;
}

/**
 * The English names the history database stores on `Entity.name`, for the
 * `wanted` entities that have one. jovespace resolves each entity's name-ID
 * field (`typeNameID`, `dungeonNameID`, …) against every new Tranquility
 * build's whole localization, so this holds the latest name, not the name as
 * of any one build. An entity the game removed keeps the last name seen. Kinds
 * whose names aren't localization messages (stargates, graphics, most planets
 * and moons) have none. One query, on `Entity`'s unique `(kind, eveId)` index.
 */
export async function readStoredNames(
  wanted: readonly { kind: string; id: number }[],
): Promise<{ kind: string; id: number; name: string }[]> {
  if (wanted.length === 0) return [];
  const rows = await buildsDb.$queryRaw<
    { kind: string; id: number | bigint | string; name: string }[]
  >`
    SELECT e."kind" AS kind, e."eveId" AS id, e."name" AS name
    FROM unnest(
      ${wanted.map((w) => w.kind)}::STRING[],
      ${wanted.map((w) => w.id)}::INT8[]
    ) AS w(kind, id)
    JOIN ${historyTable("Entity")} e
      ON e."kind" = w.kind AND e."eveId" = w.id
    WHERE e."name" IS NOT NULL
  `;
  return rows.map((r) => ({ kind: r.kind, id: Number(r.id), name: r.name }));
}

type NameRows = readonly (readonly [number, string | null | undefined])[];

/** First value with visible text; several SDE names are present but blank. */
const firstNonEmpty = (...values: (string | null | undefined)[]) =>
  values.find((v) => v?.trim());

/**
 * Our database's name for each entity kind it stores, keyed by the history's
 * entity kind. Where a row has both a display name and an internal one, the
 * display name wins, as on the entity's own page.
 */
const MAIN_DB_NAMES: Record<string, (ids: number[]) => Promise<NameRows>> = {
  type: async (ids) =>
    (
      await prisma.type.findMany({
        where: { typeId: { in: ids } },
        select: { typeId: true, name: true },
      })
    ).map((r) => [r.typeId, r.name]),
  group: async (ids) =>
    (
      await prisma.group.findMany({
        where: { groupId: { in: ids } },
        select: { groupId: true, name: true },
      })
    ).map((r) => [r.groupId, r.name]),
  category: async (ids) =>
    (
      await prisma.category.findMany({
        where: { categoryId: { in: ids } },
        select: { categoryId: true, name: true },
      })
    ).map((r) => [r.categoryId, r.name]),
  marketGroup: async (ids) =>
    (
      await prisma.marketGroup.findMany({
        where: { marketGroupId: { in: ids } },
        select: { marketGroupId: true, name: true },
      })
    ).map((r) => [r.marketGroupId, r.name]),
  metaGroup: async (ids) =>
    (
      await prisma.metaGroup.findMany({
        where: { metaGroupId: { in: ids } },
        select: { metaGroupId: true, name: true },
      })
    ).map((r) => [r.metaGroupId, r.name]),
  typeList: async (ids) =>
    (
      await prisma.typeList.findMany({
        where: { typeListId: { in: ids } },
        select: { typeListId: true, displayName: true, name: true },
      })
    ).map((r) => [r.typeListId, firstNonEmpty(r.displayName, r.name)]),
  dogmaAttribute: async (ids) =>
    (
      await prisma.dogmaAttribute.findMany({
        where: { attributeId: { in: ids } },
        select: { attributeId: true, displayName: true, name: true },
      })
    ).map((r) => [r.attributeId, firstNonEmpty(r.displayName, r.name)]),
  dogmaAttributeCategory: async (ids) =>
    (
      await prisma.dogmaAttributeCategory.findMany({
        where: { attributeCategoryId: { in: ids } },
        select: { attributeCategoryId: true, name: true },
      })
    ).map((r) => [r.attributeCategoryId, r.name]),
  // A unit's `name` ("Length") names it; its `displayName` ("m") is a symbol.
  dogmaUnit: async (ids) =>
    (
      await prisma.dogmaUnit.findMany({
        where: { unitId: { in: ids } },
        select: { unitId: true, name: true, displayName: true },
      })
    ).map((r) => [r.unitId, firstNonEmpty(r.name, r.displayName)]),
  dogmaEffect: async (ids) =>
    (
      await prisma.dogmaEffect.findMany({
        where: { effectId: { in: ids } },
        select: { effectId: true, displayName: true, name: true },
      })
    ).map((r) => [r.effectId, firstNonEmpty(r.displayName, r.name)]),
  dbuffCollection: async (ids) =>
    (
      await prisma.dbuffCollection.findMany({
        where: { dbuffCollectionId: { in: ids } },
        select: {
          dbuffCollectionId: true,
          displayName: true,
          operationName: true,
        },
      })
    ).map((r) => [
      r.dbuffCollectionId,
      firstNonEmpty(r.displayName, r.operationName),
    ]),
  graphic: async (ids) =>
    (
      await prisma.graphic.findMany({
        where: { graphicId: { in: ids } },
        select: { graphicId: true, sofHullName: true, graphicFile: true },
      })
    ).map((r) => [r.graphicId, firstNonEmpty(r.sofHullName, r.graphicFile)]),
  graphicMaterialSet: async (ids) =>
    (
      await prisma.graphicMaterialSet.findMany({
        where: { materialSetId: { in: ids } },
        select: {
          materialSetId: true,
          description: true,
          sofFactionName: true,
          sofPatternName: true,
        },
      })
    ).map((r) => [
      r.materialSetId,
      firstNonEmpty(
        r.description,
        [r.sofFactionName, r.sofPatternName].filter(Boolean).join(" "),
      ),
    ]),
  icon: async (ids) =>
    (
      await prisma.icon.findMany({
        where: { iconId: { in: ids } },
        select: { iconId: true, iconFile: true },
      })
    ).map((r) => [r.iconId, r.iconFile]),
  faction: async (ids) =>
    (
      await prisma.faction.findMany({
        where: { factionId: { in: ids } },
        select: { factionId: true, name: true },
      })
    ).map((r) => [r.factionId, r.name]),
  race: async (ids) =>
    (
      await prisma.race.findMany({
        where: { raceId: { in: ids } },
        select: { raceId: true, name: true },
      })
    ).map((r) => [r.raceId, r.name]),
  bloodline: async (ids) =>
    (
      await prisma.bloodline.findMany({
        where: { bloodlineId: { in: ids } },
        select: { bloodlineId: true, name: true },
      })
    ).map((r) => [r.bloodlineId, r.name]),
  ancestry: async (ids) =>
    (
      await prisma.ancestry.findMany({
        where: { ancestryId: { in: ids } },
        select: { ancestryId: true, name: true },
      })
    ).map((r) => [r.ancestryId, r.name]),
  corporationActivity: async (ids) =>
    (
      await prisma.corporationActivity.findMany({
        where: { corporationActivityId: { in: ids } },
        select: { corporationActivityId: true, name: true },
      })
    ).map((r) => [r.corporationActivityId, r.name]),
  npcCorporation: async (ids) =>
    (
      await prisma.corporation.findMany({
        where: { corporationId: { in: ids } },
        select: { corporationId: true, name: true },
      })
    ).map((r) => [r.corporationId, r.name]),
  npcCorporationDivision: async (ids) =>
    (
      await prisma.npcCorporationDivision.findMany({
        where: { npcCorporationDivisionId: { in: ids } },
        select: {
          npcCorporationDivisionId: true,
          displayName: true,
          name: true,
        },
      })
    ).map((r) => [
      r.npcCorporationDivisionId,
      firstNonEmpty(r.displayName, r.name),
    ]),
  npcCharacter: async (ids) =>
    (
      await prisma.character.findMany({
        where: { characterId: { in: ids } },
        select: { characterId: true, name: true },
      })
    ).map((r) => [r.characterId, r.name]),
  // An agent in space is an NPC character, keyed by its character id.
  agentInSpace: async (ids) =>
    (
      await prisma.character.findMany({
        where: { characterId: { in: ids } },
        select: { characterId: true, name: true },
      })
    ).map((r) => [r.characterId, r.name]),
  agentType: async (ids) =>
    (
      await prisma.agentType.findMany({
        where: { agentTypeId: { in: ids } },
        select: { agentTypeId: true, name: true },
      })
    ).map((r) => [r.agentTypeId, r.name]),
  certificate: async (ids) =>
    (
      await prisma.certificate.findMany({
        where: { certificateId: { in: ids } },
        select: { certificateId: true, name: true },
      })
    ).map((r) => [r.certificateId, r.name]),
  mission: async (ids) =>
    (
      await prisma.mission.findMany({
        where: { missionId: { in: ids } },
        select: { missionId: true, name: true },
      })
    ).map((r) => [r.missionId, r.name]),
  epicArc: async (ids) =>
    (
      await prisma.epicArc.findMany({
        where: { epicArcId: { in: ids } },
        select: { epicArcId: true, name: true },
      })
    ).map((r) => [r.epicArcId, r.name]),
  dungeon: async (ids) =>
    (
      await prisma.dungeon.findMany({
        where: { dungeonId: { in: ids } },
        select: { dungeonId: true, name: true },
      })
    ).map((r) => [r.dungeonId, r.name]),
  archetype: async (ids) =>
    (
      await prisma.archetype.findMany({
        where: { archetypeId: { in: ids } },
        select: { archetypeId: true, title: true },
      })
    ).map((r) => [r.archetypeId, r.title]),
  schematic: async (ids) =>
    (
      await prisma.planetSchematic.findMany({
        where: { planetSchematicId: { in: ids } },
        select: { planetSchematicId: true, name: true },
      })
    ).map((r) => [r.planetSchematicId, r.name]),
  stationOperation: async (ids) =>
    (
      await prisma.stationOperation.findMany({
        where: { stationOperationId: { in: ids } },
        select: { stationOperationId: true, operationName: true },
      })
    ).map((r) => [r.stationOperationId, r.operationName]),
  stationService: async (ids) =>
    (
      await prisma.stationService.findMany({
        where: { stationServiceId: { in: ids } },
        select: { stationServiceId: true, name: true },
      })
    ).map((r) => [r.stationServiceId, r.name]),
  region: async (ids) =>
    (
      await prisma.region.findMany({
        where: { regionId: { in: ids } },
        select: { regionId: true, name: true },
      })
    ).map((r) => [r.regionId, r.name]),
  constellation: async (ids) =>
    (
      await prisma.constellation.findMany({
        where: { constellationId: { in: ids } },
        select: { constellationId: true, name: true },
      })
    ).map((r) => [r.constellationId, r.name]),
  solarSystem: async (ids) =>
    (
      await prisma.solarSystem.findMany({
        where: { solarSystemId: { in: ids } },
        select: { solarSystemId: true, name: true },
      })
    ).map((r) => [r.solarSystemId, r.name]),
  planet: async (ids) =>
    (
      await prisma.planet.findMany({
        where: { planetId: { in: ids } },
        select: { planetId: true, name: true },
      })
    ).map((r) => [r.planetId, r.name]),
  moon: async (ids) =>
    (
      await prisma.moon.findMany({
        where: { moonId: { in: ids } },
        select: { moonId: true, name: true },
      })
    ).map((r) => [r.moonId, r.name]),
  asteroidBelt: async (ids) =>
    (
      await prisma.asteroidBelt.findMany({
        where: { asteroidBeltId: { in: ids } },
        select: { asteroidBeltId: true, name: true },
      })
    ).map((r) => [r.asteroidBeltId, r.name]),
  npcStation: async (ids) =>
    (
      await prisma.station.findMany({
        where: { stationId: { in: ids } },
        select: { stationId: true, name: true },
      })
    ).map((r) => [r.stationId, r.name]),
  star: async (ids) =>
    (
      await prisma.star.findMany({
        where: { starId: { in: ids } },
        select: { starId: true, name: true },
      })
    ).map((r) => [r.starId, r.name]),
  stargate: async (ids) =>
    (
      await prisma.stargate.findMany({
        where: { stargateId: { in: ids } },
        select: { stargateId: true, name: true },
      })
    ).map((r) => [r.stargateId, r.name]),
  // A secondary sun has no name of its own: it is its system's effect beacon,
  // so it reads as the beacon's type in that system ("Pulsar (J105443)").
  secondarySun: async (ids) => {
    const suns = await prisma.mapSecondarySun.findMany({
      where: { secondarySunId: { in: ids } },
      select: { secondarySunId: true, solarSystemId: true, typeId: true },
    });
    const [systems, types] = await Promise.all([
      prisma.solarSystem.findMany({
        where: { solarSystemId: { in: suns.map((s) => s.solarSystemId) } },
        select: { solarSystemId: true, name: true },
      }),
      prisma.type.findMany({
        where: { typeId: { in: suns.map((s) => s.typeId) } },
        select: { typeId: true, name: true },
      }),
    ]);
    const system = new Map(systems.map((s) => [s.solarSystemId, s.name]));
    const type = new Map(types.map((t) => [t.typeId, t.name]));
    return suns.map((s) => {
      const beacon = type.get(s.typeId);
      const where = system.get(s.solarSystemId);
      return [
        s.secondarySunId,
        beacon && where ? `${beacon} (${where})` : (beacon ?? where),
      ];
    });
  },
  landmark: async (ids) =>
    (
      await prisma.landmark.findMany({
        where: { landmarkId: { in: ids } },
        select: { landmarkId: true, name: true },
      })
    ).map((r) => [r.landmarkId, r.name]),
  cloneGrade: async (ids) =>
    (
      await prisma.cloneGrade.findMany({
        where: { cloneGradeId: { in: ids } },
        select: { cloneGradeId: true, name: true },
      })
    ).map((r) => [r.cloneGradeId, r.name]),
  skin: async (ids) =>
    (
      await prisma.skin.findMany({
        where: { skinId: { in: ids } },
        select: { skinId: true, internalName: true },
      })
    ).map((r) => [r.skinId, r.internalName]),
  skinMaterial: async (ids) =>
    (
      await prisma.skinMaterial.findMany({
        where: { skinMaterialId: { in: ids } },
        select: { skinMaterialId: true, displayName: true },
      })
    ).map((r) => [r.skinMaterialId, r.displayName]),
};

/**
 * The fields of an entity's own record that can name it, best first. A key
 * ending in `ID` holds a localization message id, read through the build's
 * `string:en-us` entities; any other holds the text itself, or the SDE's
 * localized `{ en, de, … }` object.
 *
 * Builds read from the game client name almost everything by message id
 * (`typeNameID`, `groupNameID`, `nameID`, `displayNameID`, …) and some kinds by
 * an internal string (`effectName`, `operationName`, `internalName`).
 * SDE-backfilled builds carry the SDE's localized `name` / `displayName`
 * instead.
 */
const NAME_FIELDS = [
  "displayNameID",
  "typeNameID",
  "groupNameID",
  "categoryNameID",
  "nameID",
  "dungeonNameID",
  "epicArcNameID",
  "landmarkNameID",
  "operationNameID",
  "entryTypeNameID",
  "roleGroupNameID",
  "titleID",
  "displayName",
  "name",
  "effectName",
  "operationName",
  "stationName",
  "roleName",
  "roleGroupName",
  "activityName",
  "title",
  "uniqueName",
  "internalName",
  "sofHullName",
  "graphicFile",
  "iconFile",
  "description",
] as const;
type NameField = (typeof NAME_FIELDS)[number];

/**
 * Fields read for the listed kinds only. A material set's `description` is its
 * name ("Order of Tetrimon [Triglavian A Hulls]"); everywhere else it is prose,
 * and on an SDE-shaped type a localized one, too large to read for nothing.
 */
const KIND_ONLY_FIELDS: Partial<Record<NameField, readonly string[]>> = {
  description: ["graphicMaterialSet"],
};

/** Kinds whose best name is not {@link NAME_FIELDS}' default order. */
const NAME_FIELD_ORDER: Partial<Record<string, readonly NameField[]>> = {
  // `name` ("Length") over the `displayNameID` symbol ("m"), as above.
  dogmaUnit: ["name", ...NAME_FIELDS.filter((f) => f !== "name")],
  graphicMaterialSet: [
    "description",
    ...NAME_FIELDS.filter((f) => f !== "description"),
  ],
};

/** Each name field's value in a change's data, unwrapping a modified row's `to`. */
const NAME_FIELDS_SQL = Prisma.raw(
  `jsonb_strip_nulls(jsonb_build_object(${NAME_FIELDS.map((f) => {
    const only = KIND_ONLY_FIELDS[f];
    const when = only
      ? `e."kind" IN (${only.map((k) => `'${k}'`).join(", ")}) AND `
      : "";
    return `'${f}', CASE WHEN ${when}c."op"::text = 'modified' THEN c."data"->'${f}'->'to' WHEN ${when}TRUE THEN c."data"->'${f}' END`;
  }).join(", ")}))`,
);

/**
 * Names for `wanted` entities as of build `atBuild`, read from the history
 * database alone, in two queries.
 *
 * The first reads every change at or before `atBuild` in each entity's primary
 * collection that touches one of its {@link NAME_FIELDS}, newest first, so
 * folding them keeps each field's latest value (a modified row holds
 * `{ from, to }`; an added or removed one, the whole record). The second reads
 * the latest English text, at or before `atBuild`, of the message ids among
 * them — usually added in the very same build as the entity — taking `from`
 * once a message was removed. Test-server (Singularity) builds are skipped, as
 * everywhere in the history views.
 *
 * Both start from `Entity`'s unique `(kind, eveId)` index and reach the
 * changes through `Change.entityId`, so neither scans the change table.
 * CockroachDB returns INT8 as a string, hence the `Number()`s.
 */
export async function readHistoryNames(
  wanted: readonly { kind: string; id: number }[],
  atBuild: number,
): Promise<{ kind: string; id: number; name: string }[]> {
  const known = wanted.filter((w) => PRIMARY_COLLECTION[w.kind]);
  if (known.length === 0) return [];
  const collections = [
    ...new Set(known.map((w) => PRIMARY_COLLECTION[w.kind] ?? "")),
  ];

  const rows = await buildsDb.$queryRaw<
    {
      kind: string;
      id: number | bigint | string;
      fields: Partial<Record<NameField, unknown>>;
    }[]
  >`
    SELECT kind, id, fields FROM (
      SELECT e."kind" AS kind, e."eveId" AS id, d."toBuild" AS build,
        ${NAME_FIELDS_SQL} AS fields
      FROM unnest(
        ${known.map((w) => w.kind)}::STRING[],
        ${known.map((w) => w.id)}::INT8[]
      ) AS w(kind, id)
      JOIN ${historyTable("Entity")} e
        ON e."kind" = w.kind AND e."eveId" = w.id
      JOIN ${historyTable("Change")} c ON c."entityId" = e."id"
      JOIN ${historyTable("Collection")} col ON col."id" = c."collectionId"
      JOIN ${historyTable("BuildDiff")} d ON d."id" = c."diffId"
      JOIN ${historyTable("Build")} b ON b."buildNumber" = d."toBuild"
      WHERE col."name" = ANY(${collections}::STRING[])
        AND col."entityKind" = e."kind"
        AND d."toBuild" <= ${atBuild}
        AND b."server"::text IS DISTINCT FROM 'singularity'
    ) named
    WHERE fields <> '{}'::JSONB
    ORDER BY build DESC
  `;

  // Each field's latest value per entity: rows come newest first.
  const latest = new Map<string, Partial<Record<NameField, unknown>>>();
  for (const r of rows) {
    const key = `${r.kind} ${Number(r.id)}`;
    const fields = latest.get(key) ?? {};
    for (const [f, v] of Object.entries(r.fields) as [NameField, unknown][])
      if (!(f in fields)) fields[f] = v;
    latest.set(key, fields);
  }

  const messageIds = new Set<number>();
  for (const fields of latest.values())
    for (const [f, v] of Object.entries(fields))
      if (f.endsWith("ID") && typeof v === "number") messageIds.add(v);
  const texts = await readMessages([...messageIds], atBuild);

  return known.flatMap(({ kind, id }) => {
    const fields = latest.get(`${kind} ${id}`);
    if (!fields) return [];
    for (const f of NAME_FIELD_ORDER[kind] ?? NAME_FIELDS) {
      const name = nameFrom(f, fields[f], texts);
      if (name) return [{ kind, id, name }];
    }
    return [];
  });
}

/** The text a name field's value stands for, if any. */
function nameFrom(
  field: NameField,
  value: unknown,
  texts: ReadonlyMap<number, string>,
): string | undefined {
  if (field.endsWith("ID"))
    return typeof value === "number" ? texts.get(value) : undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "object" && value !== null) {
    const { en } = value as { en?: unknown };
    return typeof en === "string" ? en.trim() || undefined : undefined;
  }
  return undefined;
}

/** The latest English text of each message id, at or before `atBuild`. */
async function readMessages(
  ids: readonly number[],
  atBuild: number,
): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const rows = await buildsDb.$queryRaw<
    { id: number | bigint | string; text: string | null }[]
  >`
    SELECT DISTINCT ON (e."eveId")
      e."eveId" AS id,
      NULLIF(trim(COALESCE(c."data"->>'to', c."data"->>'from')), '') AS text
    FROM ${historyTable("Entity")} e
    JOIN ${historyTable("Change")} c ON c."entityId" = e."id"
    JOIN ${historyTable("BuildDiff")} d ON d."id" = c."diffId"
    JOIN ${historyTable("Build")} b ON b."buildNumber" = d."toBuild"
    WHERE e."kind" = 'string:en-us'
      AND e."eveId" = ANY(${ids}::INT8[])
      AND d."toBuild" <= ${atBuild}
      AND b."server"::text IS DISTINCT FROM 'singularity'
    ORDER BY e."eveId", d."toBuild" DESC
  `;
  const texts = new Map<number, string>();
  for (const { id, text } of rows) if (text) texts.set(Number(id), text);
  return texts;
}

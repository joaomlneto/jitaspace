"use client";

import Link from "next/link";
import { Anchor, Badge, Group, List, Text, Title } from "@mantine/core";

import type { EntityChangeRow } from "~/lib/history";
import { collectionMeta, entityTypeMeta } from "~/lib/history";
import { RowSpoiler } from "./_row-spoiler";

/**
 * Resolved type names, by typeId, read on the server by both callers (the build
 * page and the compare page). Rows never fetch their own: one server action per
 * row, run one at a time, took minutes on a large list.
 */
type TypeNames = Record<number, string>;

// The "primary" collection per entity kind — its add/remove there means the
// entity itself was born/retired (vs. a secondary collection like typeDogma,
// which only ever decorates an existing entity).
const PRIMARY_COLLECTION: Record<string, string> = {
  type: "types",
  skin: "skins",
  skinMaterial: "skinMaterials",
  category: "categories",
  group: "groups",
  marketGroup: "marketGroups",
  metaGroup: "metaGroups",
  typeList: "typeLists",
  dogmaAttribute: "dogmaAttributes",
  dogmaAttributeCategory: "dogmaAttributeCategories",
  dogmaUnit: "dogmaUnits",
  dogmaEffect: "dogmaEffects",
  dbuffCollection: "dbuffCollections",
  graphic: "graphicIDs",
  graphicMaterialSet: "graphicMaterialSets",
  icon: "iconIDs",
  faction: "factions",
  race: "races",
  bloodline: "bloodlines",
  ancestry: "ancestries",
  corporationActivity: "corporationActivities",
  npcCorporation: "npcCorporations",
  npcCorporationDivision: "npcCorporationDivisions",
  npcCharacter: "npcCharacters",
  agentInSpace: "agentsInSpace",
  mission: "missions",
  epicArc: "epicArcs",
  dungeon: "dungeons",
  archetype: "archetypes",
  schematic: "schematics",
  stationOperation: "stationOperations",
  stationService: "stationServices",
  region: "regions",
  constellation: "constellations",
  solarSystem: "solarSystems",
  planet: "planets",
  moon: "moons",
  asteroidBelt: "asteroidBelts",
  npcStation: "npcStations",
  star: "stars",
  secondarySun: "secondarySuns",
  stargate: "stargates",
  landmark: "landmarks",
  cloneGrade: "cloneGrades",
};
const primaryOf = (entityType: string) =>
  PRIMARY_COLLECTION[entityType] ?? "types";

// Section order on a build page; anything unlisted sorts last, alphabetically.
const ENTITY_ORDER = [
  "type",
  "category",
  "group",
  "marketGroup",
  "metaGroup",
  "typeList",
  "dogmaAttribute",
  "dogmaAttributeCategory",
  "dogmaUnit",
  "dogmaEffect",
  "dbuffCollection",
  "graphic",
  "graphicMaterialSet",
  "icon",
  "faction",
  "race",
  "bloodline",
  "ancestry",
  "corporationActivity",
  "npcCorporation",
  "npcCorporationDivision",
  "npcCharacter",
  "agentInSpace",
  "mission",
  "epicArc",
  "dungeon",
  "archetype",
  "schematic",
  "stationOperation",
  "stationService",
  "region",
  "constellation",
  "solarSystem",
  "planet",
  "moon",
  "asteroidBelt",
  "npcStation",
  "star",
  "secondarySun",
  "stargate",
  "landmark",
  "cloneGrade",
  "skin",
  "skinMaterial",
];
const entityRank = (et: string) => {
  const i = ENTITY_ORDER.indexOf(et);
  return i === -1 ? ENTITY_ORDER.length : i;
};

function badgeSuffix(kind: string): string {
  if (kind === "added") return " +";
  if (kind === "removed") return " −";
  return "";
}

function EntityName({
  entityType,
  id,
  typeNames,
}: Readonly<{ entityType: string; id: number; typeNames?: TypeNames }>) {
  const label = entityTypeMeta(entityType).label;
  if (entityType !== "type") return <Text span>{label}</Text>;
  // Unnamed ⇒ newer than the ingested SDE (or, on the compare page, names that
  // could not be read); the row still shows its #id. Never fetched per row.
  return <Text span>{typeNames?.[id] ?? label}</Text>;
}

function EntityRow({
  entityType,
  id,
  badges,
  typeNames,
}: Readonly<{
  entityType: string;
  id: number;
  badges?: { collection: string; kind: string }[];
  typeNames?: TypeNames;
}>) {
  return (
    <Group gap="xs" wrap="nowrap">
      {/* No prefetch: a build lists hundreds of these, and prefetching every
          visible one fired a request per row. */}
      <Anchor
        component={Link}
        href={`/history/${entityType}/${id}`}
        prefetch={false}
      >
        <EntityName entityType={entityType} id={id} typeNames={typeNames} />{" "}
        <Text span c="dimmed">
          #{id}
        </Text>
      </Anchor>
      {badges?.map(({ collection, kind }) => {
        const meta = collectionMeta(collection);
        return (
          <Badge
            key={`${collection}-${kind}`}
            size="xs"
            variant="dot"
            color={meta.color}
          >
            {meta.label}
            {badgeSuffix(kind)}
          </Badge>
        );
      })}
    </Group>
  );
}

function ChangeList({
  title,
  color,
  entityType,
  rows,
  typeNames,
}: Readonly<{
  title: string;
  color: string;
  entityType: string;
  rows: { id: number; badges?: { collection: string; kind: string }[] }[];
  typeNames?: TypeNames;
}>) {
  if (rows.length === 0) return null;
  return (
    <div>
      <Group gap="xs" mb="xs">
        <Title order={4}>{title}</Title>
        <Badge variant="light" color={color}>
          {rows.length.toLocaleString()}
        </Badge>
      </Group>
      <RowSpoiler items={rows} fz="sm">
        {(visible) => (
          <List size="sm" spacing={2}>
            {visible.map((r) => (
              <List.Item key={r.id}>
                <EntityRow
                  entityType={entityType}
                  id={r.id}
                  badges={r.badges}
                  typeNames={typeNames}
                />
              </List.Item>
            ))}
          </List>
        )}
      </RowSpoiler>
    </div>
  );
}

/** New / Removed / Changed sections for one entity kind within a build. */
function EntityTypeSection({
  entityType,
  changes,
  typeNames,
}: Readonly<{
  entityType: string;
  changes: EntityChangeRow[];
  typeNames?: TypeNames;
}>) {
  const primary = primaryOf(entityType);
  const isPrimary = (c?: string) => (c ?? "types") === primary;
  const plural = entityTypeMeta(entityType).plural.toLowerCase();

  const newRows = changes
    .filter((c) => isPrimary(c.collection) && c.kind === "added")
    .map((c) => ({ id: c.entityId }));
  const removedRows = changes
    .filter((c) => isPrimary(c.collection) && c.kind === "removed")
    .map((c) => ({ id: c.entityId }));

  // Everything that isn't a primary birth/death is a per-entity change, with a
  // badge for each collection that touched it.
  const changedById = new Map<number, { collection: string; kind: string }[]>();
  for (const c of changes) {
    if (isPrimary(c.collection) && c.kind !== "modified") continue;
    const list = changedById.get(c.entityId) ?? [];
    list.push({ collection: c.collection ?? "types", kind: c.kind });
    changedById.set(c.entityId, list);
  }
  const changedRows = [...changedById.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, badges]) => ({ id, badges }));

  return (
    <>
      <ChangeList
        title={`New ${plural}`}
        color="green"
        entityType={entityType}
        rows={newRows}
        typeNames={typeNames}
      />
      <ChangeList
        title={`Removed ${plural}`}
        color="red"
        entityType={entityType}
        rows={removedRows}
        typeNames={typeNames}
      />
      <ChangeList
        title={`Changed ${plural}`}
        color="blue"
        entityType={entityType}
        rows={changedRows}
        typeNames={typeNames}
      />
    </>
  );
}

/**
 * Groups a build's decoded-SDE changes by entity kind and renders the
 * New / Removed / Changed sections for each, ordered type → … → skin.
 */
export function EntityChangeSections({
  changes,
  typeNames,
}: Readonly<{
  changes: EntityChangeRow[];
  typeNames?: TypeNames;
}>) {
  const byEntityType = new Map<string, EntityChangeRow[]>();
  for (const c of changes) {
    const et = c.entityType ?? "type";
    const list = byEntityType.get(et) ?? [];
    list.push(c);
    byEntityType.set(et, list);
  }
  const entityTypes = [...byEntityType.entries()].sort(
    ([a], [b]) => entityRank(a) - entityRank(b) || a.localeCompare(b),
  );

  return (
    <>
      {entityTypes.map(([et, etChanges]) => (
        <EntityTypeSection
          key={et}
          entityType={et}
          changes={etChanges}
          typeNames={typeNames}
        />
      ))}
    </>
  );
}

"use client";

import Link from "next/link";
import {
  Anchor,
  Badge,
  Group,
  List,
  Spoiler,
  Text,
  Title,
} from "@mantine/core";

import type { BuildChanges, EntityNames } from "~/lib/history";
import { collectionMeta, entityTypeMeta } from "~/lib/history";

// Collapse change lists past ~20 rows (Mantine Spoiler).
const SPOILER_MAX_HEIGHT = 520;

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
  dogmaAttribute: "dogmaAttributes",
  dogmaAttributeCategory: "dogmaAttributeCategories",
  dogmaEffect: "dogmaEffects",
  dbuffCollection: "dbuffCollections",
  graphic: "graphicIDs",
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
  stargate: "stargates",
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
  "dogmaAttribute",
  "dogmaAttributeCategory",
  "dogmaEffect",
  "dbuffCollection",
  "graphic",
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
  "stargate",
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

function EntityRow({
  entityType,
  id,
  name,
  badges,
}: Readonly<{
  entityType: string;
  id: number;
  name?: string;
  badges?: { collection: string; kind: string }[];
}>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Anchor component={Link} href={`/history/${entityType}/${id}`}>
        {/* Names arrive resolved from the server. Without one — an id our SDE
            tables don't carry — the kind is still a more useful label than
            nothing, and the id follows either way. */}
        <Text span>{name ?? entityTypeMeta(entityType).label}</Text>{" "}
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
  names,
  rows,
}: Readonly<{
  title: string;
  color: string;
  entityType: string;
  names?: Record<number, string>;
  rows: { id: number; badges?: { collection: string; kind: string }[] }[];
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
      <Spoiler
        maxHeight={SPOILER_MAX_HEIGHT}
        showLabel={`Show all ${rows.length.toLocaleString()}`}
        hideLabel="Show less"
        fz="sm"
      >
        <List size="sm" spacing={2}>
          {rows.map((r) => (
            <List.Item key={r.id}>
              <EntityRow
                entityType={entityType}
                id={r.id}
                name={names?.[r.id]}
                badges={r.badges}
              />
            </List.Item>
          ))}
        </List>
      </Spoiler>
    </div>
  );
}

/** New / Removed / Changed sections for one entity kind within a build. */
function EntityTypeSection({
  entityType,
  names,
  changes,
}: Readonly<{
  entityType: string;
  names?: Record<number, string>;
  changes: BuildChanges["changes"];
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
        names={names}
        rows={newRows}
      />
      <ChangeList
        title={`Removed ${plural}`}
        color="red"
        entityType={entityType}
        names={names}
        rows={removedRows}
      />
      <ChangeList
        title={`Changed ${plural}`}
        color="blue"
        entityType={entityType}
        names={names}
        rows={changedRows}
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
  names,
}: Readonly<{
  changes: BuildChanges["changes"];
  /** Server-resolved names, keyed entityType → entityId → name. */
  names?: EntityNames;
}>) {
  const byEntityType = new Map<string, BuildChanges["changes"]>();
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
          names={names?.[et]}
          changes={etChanges}
        />
      ))}
    </>
  );
}

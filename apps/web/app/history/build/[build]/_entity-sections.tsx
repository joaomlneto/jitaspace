"use client";

import Link from "next/link";
import { Anchor, Badge, Group, List, Text, Title } from "@mantine/core";

import type { EntityChangeRow, EntityNames } from "~/lib/history";
import {
  collectionMeta,
  entityHistoryHref,
  entityTypeMeta,
  primaryCollectionOf,
} from "~/lib/history";
import { RowSpoiler } from "./_row-spoiler";

/**
 * One kind's names, by id, out of the {@link EntityNames} both callers (the
 * build page and the compare page) read on the server. Rows never fetch their
 * own: one server action per row, run one at a time, took minutes on a large
 * list.
 */
type KindNames = Record<number, string>;

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
  names,
}: Readonly<{ entityType: string; id: number; names?: KindNames }>) {
  // Every changed entity has a name, so the kind's label is only ever shown
  // when a lookup failed (or, on the compare page, the names could not be read
  // at all); the row still shows its #id. Never fetched per row.
  return <Text span>{names?.[id] ?? entityTypeMeta(entityType).label}</Text>;
}

function EntityRow({
  entityType,
  id,
  badges,
  names,
}: Readonly<{
  entityType: string;
  id: number;
  badges?: { collection: string; kind: string }[];
  names?: KindNames;
}>) {
  return (
    <Group gap="xs" wrap="nowrap">
      {/* No prefetch: a build lists hundreds of these, and prefetching every
          visible one fired a request per row. */}
      <Anchor
        component={Link}
        href={entityHistoryHref(entityType, id)}
        prefetch={false}
      >
        <EntityName entityType={entityType} id={id} names={names} />{" "}
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
  names,
}: Readonly<{
  title: string;
  color: string;
  entityType: string;
  rows: { id: number; badges?: { collection: string; kind: string }[] }[];
  names?: KindNames;
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
                  names={names}
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
  names,
}: Readonly<{
  entityType: string;
  changes: EntityChangeRow[];
  names?: KindNames;
}>) {
  const primary = primaryCollectionOf(entityType);
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
        names={names}
      />
      <ChangeList
        title={`Removed ${plural}`}
        color="red"
        entityType={entityType}
        rows={removedRows}
        names={names}
      />
      <ChangeList
        title={`Changed ${plural}`}
        color="blue"
        entityType={entityType}
        rows={changedRows}
        names={names}
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
  changes: EntityChangeRow[];
  names?: EntityNames;
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
          names={names?.[et]}
        />
      ))}
    </>
  );
}

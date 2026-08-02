"use client";

import type { TextProps } from "@mantine/core";
import { Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { sdeRecordQueryOptions } from "@jitaspace/hooks";

import {
  CategoryAnchor,
  CategoryName,
  DogmaAttributeAnchor,
  DogmaAttributeName,
  DogmaAttributeValue,
  DogmaEffectAnchor,
  DogmaEffectName,
  FactionAnchor,
  FactionName,
  GroupAnchor,
  GroupName,
  MarketGroupAnchor,
  MarketGroupName,
  RaceAnchor,
  RaceName,
  TypeAnchor,
  TypeName,
} from "./_sde-ui";

// Entities newer than the last SDE ingest aren't in the database yet (our
// history is generated straight from the game client, which can be ahead of the
// SDE release) — those lookups resolve to null, and each label falls back to the
// raw id instead of hanging on a skeleton.

/** Prefer an entity's display name, falling back to its internal name. */
function preferredName(
  record: { name?: string | null; displayName?: string | null } | null,
): string | undefined {
  if (!record) return undefined;
  const display = record.displayName?.trim();
  if (display) return display;
  // Some reference rows carry an empty name; treat that as "no label" so the
  // caller falls back to the raw id rather than rendering nothing.
  const name = record.name?.trim();
  return name === "" ? undefined : name;
}

function renderAttributeContent(
  id: number,
  name: string | undefined,
  isPending: boolean,
) {
  if (name) return <DogmaAttributeName span size="xs" name={name} />;
  if (isPending) return <DogmaAttributeName span size="xs" />;
  return (
    <Text span size="xs">
      #{id}
    </Text>
  );
}

function AttributeLabel({ id }: Readonly<{ id: number }>) {
  const query = useQuery(sdeRecordQueryOptions("dogma-attribute", id));
  const name = preferredName(query.data ?? null);
  return (
    <DogmaAttributeAnchor attributeId={id} size="xs">
      {renderAttributeContent(id, name, query.isPending)}
    </DogmaAttributeAnchor>
  );
}

function renderEffectContent(
  id: number,
  name: string | undefined,
  isPending: boolean,
) {
  if (name) return <DogmaEffectName span size="xs" name={name} />;
  if (isPending) return <DogmaEffectName span size="xs" />;
  return (
    <Text span size="xs">
      #{id}
    </Text>
  );
}

function EffectLabel({ id }: Readonly<{ id: number }>) {
  const query = useQuery(sdeRecordQueryOptions("dogma-effect", id));
  const name = preferredName(query.data ?? null);
  return (
    <DogmaEffectAnchor effectId={id} size="xs">
      {renderEffectContent(id, name, query.isPending)}
    </DogmaEffectAnchor>
  );
}

/**
 * A single dogma attribute value, formatted for the attribute's unit. Resolves
 * the attribute's unit and that unit's display symbol from the database, then
 * defers to the shared <DogmaAttributeValue>. While the unit is still loading
 * (or the attribute is newer than the last SDE ingest) it falls back to a plain
 * number. Extra <Text> props (colour, strike-through) pass straight through.
 */
export function DogmaValue({
  attributeId,
  value,
  ...textProps
}: Readonly<{ attributeId: number; value: number } & TextProps>) {
  const attribute = useQuery(
    sdeRecordQueryOptions("dogma-attribute", attributeId),
  );
  const unitId = attribute.data?.unitId ?? undefined;
  const unit = useQuery(sdeRecordQueryOptions("dogma-unit", unitId));
  const symbol = preferredName(unit.data ?? null);
  return (
    <DogmaAttributeValue
      span
      size="xs"
      value={value}
      unitId={unitId}
      unitSymbol={symbol}
      {...textProps}
    />
  );
}

function pickFromColor(
  from: number,
  to: number,
  highColor: string,
  lowColor: string,
): string | undefined {
  if (from === to) return undefined;
  if (from > to) return highColor;
  return lowColor;
}

function pickToColor(
  from: number,
  to: number,
  highColor: string,
  lowColor: string,
): string | undefined {
  if (from === to) return undefined;
  if (to > from) return highColor;
  return lowColor;
}

/**
 * A dogma attribute's value going `from → to`, formatted for its unit and
 * coloured by direction *and* the attribute's `highIsGood` flag: the higher
 * value is green (a buff) unless the attribute is explicitly "high is bad", in
 * which case the higher value is red. Equal values stay neutral. Colouring is
 * computed on the raw values, so it stays correct even for inverted units like
 * resistances (where a higher stored value displays as a lower percentage).
 */
export function AttributeValueChange({
  id,
  from,
  to,
}: Readonly<{
  id: number;
  from: number;
  to: number;
}>) {
  const query = useQuery(sdeRecordQueryOptions("dogma-attribute", id));
  const highIsGood = query.data?.highIsGood ?? undefined;
  const highColor = highIsGood === false ? "red" : "green";
  const lowColor = highIsGood === false ? "green" : "red";
  const fromColor = pickFromColor(from, to, highColor, lowColor);
  const toColor = pickToColor(from, to, highColor, lowColor);
  return (
    <Text span size="xs">
      {": "}
      <DogmaValue attributeId={id} value={from} c={fromColor} />
      {" → "}
      <DogmaValue attributeId={id} value={to} c={toColor} />
    </Text>
  );
}

type LabelSize = "xs" | "sm";

/** Dimmed " › " separator between breadcrumb crumbs. */
function CrumbSep({ size }: Readonly<{ size: LabelSize }>) {
  return (
    <Text span size={size} c="dimmed">
      {" › "}
    </Text>
  );
}

function renderCategoryContent(
  id: number,
  size: LabelSize,
  name: string | undefined,
  isPending: boolean,
) {
  if (name) return <CategoryName span size={size} name={name} />;
  if (isPending) return <CategoryName span size={size} />;
  return (
    <Text span size={size}>
      #{id}
    </Text>
  );
}

function CategoryLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  const query = useQuery(sdeRecordQueryOptions("category", id));
  const name = preferredName(query.data ?? null);
  return (
    <CategoryAnchor categoryId={id} size={size} c="dimmed">
      {renderCategoryContent(id, size, name, query.isPending)}
    </CategoryAnchor>
  );
}

function renderGroupContent(
  id: number,
  size: LabelSize,
  name: string | undefined,
  isPending: boolean,
) {
  if (name) return <GroupName span size={size} name={name} />;
  if (isPending) return <GroupName span size={size} />;
  return (
    <Text span size={size}>
      #{id}
    </Text>
  );
}

/** Breadcrumbed group: Category › Group. `dim` greys the group itself out
 *  (used when the group is itself a parent crumb of a type). */
export function GroupLabel({
  id,
  size = "xs",
  dim = false,
}: Readonly<{
  id: number;
  size?: LabelSize;
  dim?: boolean;
}>) {
  const query = useQuery(sdeRecordQueryOptions("group", id));
  const categoryId = query.data?.categoryId;
  const name = preferredName(query.data ?? null);
  return (
    <>
      {categoryId !== undefined && (
        <>
          <CategoryLabel id={categoryId} size={size} />
          <CrumbSep size={size} />
        </>
      )}
      <GroupAnchor groupId={id} size={size} c={dim ? "dimmed" : undefined}>
        {renderGroupContent(id, size, name, query.isPending)}
      </GroupAnchor>
    </>
  );
}

/** Breadcrumbed type: Category › Group › Type. */
export function TypeLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  const query = useQuery(sdeRecordQueryOptions("type", id));
  const groupId = query.data?.groupId;
  return (
    <>
      {groupId !== undefined && (
        <>
          <GroupLabel id={groupId} size={size} dim />
          <CrumbSep size={size} />
        </>
      )}
      <TypeAnchor typeId={id} size={size}>
        <TypeName span size={size} typeId={id} />
      </TypeAnchor>
    </>
  );
}

function renderMarketGroupContent(
  id: number,
  size: LabelSize,
  name: string | undefined,
  isPending: boolean,
) {
  if (name) return <MarketGroupName span size={size} name={name} />;
  if (isPending) return <MarketGroupName span size={size} />;
  return (
    <Text span size={size}>
      #{id}
    </Text>
  );
}

/** Breadcrumbed market group: the full parent chain, recursively. */
export function MarketGroupLabel({
  id,
  size = "xs",
  dim = false,
}: Readonly<{
  id: number;
  size?: LabelSize;
  dim?: boolean;
}>) {
  const query = useQuery(sdeRecordQueryOptions("market-group", id));
  const parentMarketGroupId = query.data?.parentMarketGroupId ?? undefined;
  const name = preferredName(query.data ?? null);
  return (
    <>
      {parentMarketGroupId !== undefined && (
        <>
          <MarketGroupLabel id={parentMarketGroupId} size={size} dim />
          <CrumbSep size={size} />
        </>
      )}
      <MarketGroupAnchor
        marketGroupId={id}
        size={size}
        c={dim ? "dimmed" : undefined}
      >
        {renderMarketGroupContent(id, size, name, query.isPending)}
      </MarketGroupAnchor>
    </>
  );
}

function renderRaceContent(
  id: number,
  size: LabelSize,
  name: string | undefined,
  isPending: boolean,
) {
  if (name) return <RaceName span size={size} name={name} />;
  if (isPending) return <RaceName span size={size} />;
  return (
    <Text span size={size}>
      #{id}
    </Text>
  );
}

export function RaceLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  const query = useQuery(sdeRecordQueryOptions("race", id));
  const name = preferredName(query.data ?? null);
  return (
    <RaceAnchor raceId={id} size={size}>
      {renderRaceContent(id, size, name, query.isPending)}
    </RaceAnchor>
  );
}

export function FactionLabel({
  id,
  size = "xs",
}: Readonly<{
  id: number;
  size?: LabelSize;
}>) {
  return (
    <FactionAnchor factionId={id} size={size}>
      <FactionName span size={size} factionId={id} />
    </FactionAnchor>
  );
}

/** Name + link for a sub-record key, resolved by the kind of id it holds. */
export function SubKeyLabel({
  keyField,
  id,
}: Readonly<{ keyField: string; id: string }>) {
  const numeric = Number(id);
  if (Number.isFinite(numeric)) {
    if (keyField === "attributeID") return <AttributeLabel id={numeric} />;
    if (keyField === "effectID") return <EffectLabel id={numeric} />;
    if (
      keyField === "typeID" ||
      keyField === "materialTypeID" ||
      keyField === "skillTypeID"
    ) {
      return <TypeLabel id={numeric} />;
    }
  }
  return (
    <Text span size="xs">
      #{id}
    </Text>
  );
}

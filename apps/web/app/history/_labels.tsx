"use client";

import type { TextProps } from "@mantine/core";
import { Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import {
  getCategoryByIdQueryOptions,
  getDogmaAttributeByIdQueryOptions,
  getDogmaEffectByIdQueryOptions,
  getDogmaUnitByIdQueryOptions,
  getGroupByIdQueryOptions,
  getMarketGroupByIdQueryOptions,
  getRaceByIdQueryOptions,
  getTypeByIdQueryOptions,
} from "@jitaspace/sde-client";

import { sdeLabel } from "./_diff";
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

// Entities newer than the published SDE 404 on the name lookup (our history is
// generated straight from the client, which can be ahead of the SDE release) —
// fall back to the raw id instead of a skeleton, and don't retry the 404.

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
  const query = useQuery({
    ...getDogmaAttributeByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
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
  const query = useQuery({
    ...getDogmaEffectByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
  return (
    <DogmaEffectAnchor effectId={id} size="xs">
      {renderEffectContent(id, name, query.isPending)}
    </DogmaEffectAnchor>
  );
}

/**
 * A single dogma attribute value, formatted for the attribute's unit. Resolves
 * the attribute's `unitID` and the unit's display symbol from the SDE, then
 * defers to the shared <DogmaAttributeValue>. While the unit is still loading
 * (or the attribute is newer than the published SDE) it falls back to a plain
 * number. Extra <Text> props (colour, strike-through) pass straight through.
 */
export function DogmaValue({
  attributeId,
  value,
  ...textProps
}: Readonly<{ attributeId: number; value: number } & TextProps>) {
  const attribute = useQuery({
    ...getDogmaAttributeByIdQueryOptions(attributeId),
    staleTime: Infinity,
    retry: false,
  });
  const unitId = (attribute.data?.data as { unitID?: number } | undefined)
    ?.unitID;
  const unit = useQuery({
    ...getDogmaUnitByIdQueryOptions(unitId ?? 0),
    staleTime: Infinity,
    retry: false,
    enabled: unitId !== undefined,
  });
  const symbol = (
    unit.data?.data as { displayName?: { en?: string } } | undefined
  )?.displayName?.en;
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
  const query = useQuery({
    ...getDogmaAttributeByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const highIsGood = (query.data?.data as { highIsGood?: boolean } | undefined)
    ?.highIsGood;
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
  const query = useQuery({
    ...getCategoryByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
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
  const query = useQuery({
    ...getGroupByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const data = query.data?.data as { categoryID?: number } | undefined;
  const name = sdeLabel(query.data?.data);
  return (
    <>
      {data?.categoryID !== undefined && (
        <>
          <CategoryLabel id={data.categoryID} size={size} />
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
  const query = useQuery({
    ...getTypeByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const data = query.data?.data as { groupID?: number } | undefined;
  return (
    <>
      {data?.groupID !== undefined && (
        <>
          <GroupLabel id={data.groupID} size={size} dim />
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
  const query = useQuery({
    ...getMarketGroupByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const data = query.data?.data as { parentGroupID?: number } | undefined;
  const name = sdeLabel(query.data?.data);
  return (
    <>
      {data?.parentGroupID !== undefined && (
        <>
          <MarketGroupLabel id={data.parentGroupID} size={size} dim />
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
  const query = useQuery({
    ...getRaceByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
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

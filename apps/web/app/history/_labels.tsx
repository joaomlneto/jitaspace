"use client";

import type { TextProps } from "@mantine/core";
import Link from "next/link";
import { Anchor, Text } from "@mantine/core";

import { useEntityName, useHistoryLabels } from "./_labels-context";
import {
  CategoryAnchor,
  CorporationAnchor,
  DogmaAttributeAnchor,
  DogmaAttributeValue,
  DogmaEffectAnchor,
  FactionAnchor,
  GroupAnchor,
  MarketGroupAnchor,
  RaceAnchor,
  TypeAnchor,
} from "./_sde-ui";

/**
 * Named, linked labels for the ids in a timeline's values. Every name, parent
 * and unit comes from the labels the server read with the timeline
 * (`HistoryLabelsProvider`), so nothing here fetches. An id the labels do not
 * name shows as `#id`; every changed entity has a name, so that means a lookup
 * failed to find one.
 */

type LabelSize = "xs" | "sm";

/** The entity's name, or `#id` when nothing names it. */
function NameText({
  kind,
  id,
  size,
}: Readonly<{ kind: string; id: number; size: LabelSize }>) {
  const name = useEntityName(kind, id);
  return (
    <Text span size={size}>
      {name ?? `#${id}`}
    </Text>
  );
}

/** Dimmed " › " separator between breadcrumb crumbs. */
function CrumbSep({ size }: Readonly<{ size: LabelSize }>) {
  return (
    <Text span size={size} c="dimmed">
      {" › "}
    </Text>
  );
}

function AttributeLabel({ id }: Readonly<{ id: number }>) {
  return (
    <DogmaAttributeAnchor attributeId={id} size="xs">
      <NameText kind="dogmaAttribute" id={id} size="xs" />
    </DogmaAttributeAnchor>
  );
}

function EffectLabel({ id }: Readonly<{ id: number }>) {
  return (
    <DogmaEffectAnchor effectId={id} size="xs">
      <NameText kind="dogmaEffect" id={id} size="xs" />
    </DogmaEffectAnchor>
  );
}

/**
 * A single dogma attribute value, formatted for the attribute's unit. Extra
 * <Text> props (colour, strike-through) pass straight through.
 */
export function DogmaValue({
  attributeId,
  value,
  ...textProps
}: Readonly<{ attributeId: number; value: number } & TextProps>) {
  const labels = useHistoryLabels();
  const unitId = labels.attributes[attributeId]?.unitId ?? undefined;
  const symbol = unitId === undefined ? undefined : labels.unitSymbols[unitId];
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
  const highIsGood = useHistoryLabels().attributes[id]?.highIsGood;
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

export function CategoryLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  return (
    <CategoryAnchor categoryId={id} size={size} c="dimmed">
      <NameText kind="category" id={id} size={size} />
    </CategoryAnchor>
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
  const parentId = useHistoryLabels().parents.group[id];
  return (
    <>
      {parentId !== undefined && (
        <>
          <CategoryLabel id={parentId} size={size} />
          <CrumbSep size={size} />
        </>
      )}
      <GroupAnchor groupId={id} size={size} c={dim ? "dimmed" : undefined}>
        <NameText kind="group" id={id} size={size} />
      </GroupAnchor>
    </>
  );
}

/** Breadcrumbed type: Category › Group › Type. */
export function TypeLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  const parentId = useHistoryLabels().parents.type[id];
  return (
    <>
      {parentId !== undefined && (
        <>
          <GroupLabel id={parentId} size={size} dim />
          <CrumbSep size={size} />
        </>
      )}
      <TypeAnchor typeId={id} size={size}>
        <NameText kind="type" id={id} size={size} />
      </TypeAnchor>
    </>
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
  const parentId = useHistoryLabels().parents.marketGroup[id];
  return (
    <>
      {parentId !== undefined && (
        <>
          <MarketGroupLabel id={parentId} size={size} dim />
          <CrumbSep size={size} />
        </>
      )}
      <MarketGroupAnchor
        marketGroupId={id}
        size={size}
        c={dim ? "dimmed" : undefined}
      >
        <NameText kind="marketGroup" id={id} size={size} />
      </MarketGroupAnchor>
    </>
  );
}

export function RaceLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  return (
    <RaceAnchor raceId={id} size={size}>
      <NameText kind="race" id={id} size={size} />
    </RaceAnchor>
  );
}

export function FactionLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  return (
    <FactionAnchor factionId={id} size={size}>
      <NameText kind="faction" id={id} size={size} />
    </FactionAnchor>
  );
}

export function CorporationLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  return (
    <CorporationAnchor corporationId={id} size={size}>
      <NameText kind="npcCorporation" id={id} size={size} />
    </CorporationAnchor>
  );
}

/** A skin material, linked to its own change history. */
export function SkinMaterialLabel({
  id,
  size = "xs",
}: Readonly<{ id: number; size?: LabelSize }>) {
  return (
    <Anchor
      component={Link}
      href={`/history/skinMaterial/${id}`}
      size={size}
      prefetch={false}
    >
      <NameText kind="skinMaterial" id={id} size={size} />
    </Anchor>
  );
}

/** An entity with no page of its own to link to (meta groups, units, …). */
export function PlainLabel({
  kind,
  id,
  size = "xs",
}: Readonly<{ kind: string; id: number; size?: LabelSize }>) {
  return <NameText kind={kind} id={id} size={size} />;
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

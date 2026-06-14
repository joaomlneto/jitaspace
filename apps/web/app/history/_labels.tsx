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
import { sdeLabel } from "./_diff";

// Entities newer than the published SDE 404 on the name lookup (our history is
// generated straight from the client, which can be ahead of the SDE release) —
// fall back to the raw id instead of a skeleton, and don't retry the 404.
function AttributeLabel({ id }: { id: number }) {
  const query = useQuery({
    ...getDogmaAttributeByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
  return (
    <DogmaAttributeAnchor attributeId={id} size="xs">
      {name ? (
        <DogmaAttributeName span size="xs" name={name} />
      ) : query.isPending ? (
        <DogmaAttributeName span size="xs" />
      ) : (
        <Text span size="xs">
          #{id}
        </Text>
      )}
    </DogmaAttributeAnchor>
  );
}

function EffectLabel({ id }: { id: number }) {
  const query = useQuery({
    ...getDogmaEffectByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
  return (
    <DogmaEffectAnchor effectId={id} size="xs">
      {name ? (
        <DogmaEffectName span size="xs" name={name} />
      ) : query.isPending ? (
        <DogmaEffectName span size="xs" />
      ) : (
        <Text span size="xs">
          #{id}
        </Text>
      )}
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
}: { attributeId: number; value: number } & TextProps) {
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
}: {
  id: number;
  from: number;
  to: number;
}) {
  const query = useQuery({
    ...getDogmaAttributeByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const highIsGood = (query.data?.data as { highIsGood?: boolean } | undefined)
    ?.highIsGood;
  const highColor = highIsGood === false ? "red" : "green";
  const lowColor = highIsGood === false ? "green" : "red";
  const fromColor = from === to ? undefined : from > to ? highColor : lowColor;
  const toColor = from === to ? undefined : to > from ? highColor : lowColor;
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
function CrumbSep({ size }: { size: LabelSize }) {
  return (
    <Text span size={size} c="dimmed">
      {" › "}
    </Text>
  );
}

function CategoryLabel({ id, size = "xs" }: { id: number; size?: LabelSize }) {
  const query = useQuery({
    ...getCategoryByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
  return (
    <CategoryAnchor categoryId={id} size={size} c="dimmed">
      {name ? (
        <CategoryName span size={size} name={name} />
      ) : query.isPending ? (
        <CategoryName span size={size} />
      ) : (
        <Text span size={size}>
          #{id}
        </Text>
      )}
    </CategoryAnchor>
  );
}

/** Breadcrumbed group: Category › Group. `dim` greys the group itself out
 *  (used when the group is itself a parent crumb of a type). */
export function GroupLabel({
  id,
  size = "xs",
  dim = false,
}: {
  id: number;
  size?: LabelSize;
  dim?: boolean;
}) {
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
        {name ? (
          <GroupName span size={size} name={name} />
        ) : query.isPending ? (
          <GroupName span size={size} />
        ) : (
          <Text span size={size}>
            #{id}
          </Text>
        )}
      </GroupAnchor>
    </>
  );
}

/** Breadcrumbed type: Category › Group › Type. */
export function TypeLabel({ id, size = "xs" }: { id: number; size?: LabelSize }) {
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

/** Breadcrumbed market group: the full parent chain, recursively. */
export function MarketGroupLabel({
  id,
  size = "xs",
  dim = false,
}: {
  id: number;
  size?: LabelSize;
  dim?: boolean;
}) {
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
        {name ? (
          <MarketGroupName span size={size} name={name} />
        ) : query.isPending ? (
          <MarketGroupName span size={size} />
        ) : (
          <Text span size={size}>
            #{id}
          </Text>
        )}
      </MarketGroupAnchor>
    </>
  );
}

export function RaceLabel({ id, size = "xs" }: { id: number; size?: LabelSize }) {
  const query = useQuery({
    ...getRaceByIdQueryOptions(id),
    staleTime: Infinity,
    retry: false,
  });
  const name = sdeLabel(query.data?.data);
  return (
    <RaceAnchor raceId={id} size={size}>
      {name ? (
        <RaceName span size={size} name={name} />
      ) : query.isPending ? (
        <RaceName span size={size} />
      ) : (
        <Text span size={size}>
          #{id}
        </Text>
      )}
    </RaceAnchor>
  );
}

export function FactionLabel({
  id,
  size = "xs",
}: {
  id: number;
  size?: LabelSize;
}) {
  return (
    <FactionAnchor factionId={id} size={size}>
      <FactionName span size={size} factionId={id} />
    </FactionAnchor>
  );
}

/** Name + link for a sub-record key, resolved by the kind of id it holds. */
export function SubKeyLabel({ keyField, id }: { keyField: string; id: string }) {
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

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Anchor, Group, Spoiler, Stack, Text } from "@mantine/core";

import { ISKAmount } from "./_sde-ui";

import type { FieldDelta } from "~/lib/history";
import { formatValue } from "~/lib/history";

import type { SubRow } from "./_diff";
import {
  arrayKeyOf,
  diffLeaves,
  isPlainObject,
  keyLabel,
  restSummary,
  SPOILER_MAX_HEIGHT,
  summarize,
} from "./_diff";
import {
  AttributeValueChange,
  DogmaValue,
  FactionLabel,
  GroupLabel,
  MarketGroupLabel,
  RaceLabel,
  SubKeyLabel,
  TypeLabel,
} from "./_labels";

/**
 * Entity-aware rendering for well-known type metadata fields (groupID, raceID,
 * wreckTypeID, …). Returns null when the field has no special meaning — and
 * deliberately leaves `typeID` plain: it is the page's own id. `entityType` is
 * the kind of entity being viewed, used to avoid self-linking its own id field.
 */
export function entityValueFor(
  field: string,
  value: unknown,
  entityType?: string,
): ReactNode | null {
  // A list of typeIDs (e.g. a skin's applicable ship `types`) — link each, so
  // they read as items rather than a comma-formatted "37,453".
  if (
    field === "types" &&
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === "number")
  ) {
    return (
      <Spoiler
        maxHeight={SPOILER_MAX_HEIGHT}
        showLabel={`Show all ${value.length}`}
        hideLabel="Show less"
        fz="xs"
      >
        <Stack gap={1}>
          {value.map((id) => (
            <Group gap={4} key={id}>
              <TypeLabel id={id} />
            </Group>
          ))}
        </Stack>
      </Spoiler>
    );
  }
  if (typeof value !== "number") return null;
  switch (field) {
    case "wreckTypeID":
      return <TypeLabel id={value} size="sm" />;
    case "groupID":
      return <GroupLabel id={value} size="sm" />;
    case "marketGroupID":
      return <MarketGroupLabel id={value} size="sm" />;
    case "raceID":
      return <RaceLabel id={value} size="sm" />;
    case "factionID":
      return <FactionLabel id={value} size="sm" />;
    case "basePrice":
      return <ISKAmount span size="sm" amount={value} />;
    case "skinMaterialID":
      // cross-link to the material's own timeline — but not on the material's
      // own page, where this is its identity field (cf. typeID above).
      return entityType === "skinMaterial" ? null : (
        <Anchor
          component={Link}
          href={`/history/skinMaterial/${value}`}
          size="sm"
        >
          #{value}
        </Anchor>
      );
    default:
      return null;
  }
}

/**
 * Full rendering of a field value: keyed arrays of records become one named,
 * linked row per entry; everything else falls back to formatted text.
 */
export function RichValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    const keyField = arrayKeyOf(value);
    if (keyField) {
      const objs = value as Record<string, unknown>[];
      return (
        <Spoiler
          maxHeight={SPOILER_MAX_HEIGHT}
          showLabel={`Show all ${objs.length}`}
          hideLabel="Show less"
          fz="xs"
        >
          <Stack gap={1}>
            {objs.map((o, i) => {
              const rest = restSummary(o, keyField);
              return (
                <Group gap={4} key={`${keyLabel(o[keyField])}-${i}`}>
                  <SubKeyLabel keyField={keyField} id={keyLabel(o[keyField])} />
                  {keyField === "attributeID" && typeof o.value === "number" ? (
                    // dogma attribute: show its value formatted for its unit
                    <Text span size="xs" c="dimmed">
                      (
                      <DogmaValue
                        attributeId={Number(keyLabel(o[keyField]))}
                        value={o.value}
                        c="dimmed"
                      />
                      )
                    </Text>
                  ) : (
                    rest && (
                      <Text size="xs" c="dimmed">
                        ({rest})
                      </Text>
                    )
                  )}
                </Group>
              );
            })}
          </Stack>
        </Spoiler>
      );
    }
    return <Text size="sm">{value.map((v) => formatValue(v)).join(", ")}</Text>;
  }
  return <Text size="sm">{formatValue(value)}</Text>;
}

function CappedRows({ rows }: { rows: SubRow[] }) {
  return (
    <Spoiler
      maxHeight={SPOILER_MAX_HEIGHT}
      showLabel={`Show all ${rows.length}`}
      hideLabel="Show less"
      fz="xs"
    >
      <Stack gap={1}>
        {rows.map((r) => {
          const color =
            r.kind === "added"
              ? "green"
              : r.kind === "removed"
                ? "red"
                : undefined;
          const strike =
            r.kind === "removed"
              ? { textDecoration: "line-through" as const }
              : undefined;
          return (
            <Group gap={4} key={`${r.kind}-${r.key}`}>
              <Text size="xs" c={color}>
                {r.kind === "added" ? "+" : r.kind === "removed" ? "−" : "~"}
              </Text>
              {r.label}
              {r.node ?? (
                <Text size="xs" c={color} style={strike}>
                  {r.text}
                </Text>
              )}
            </Group>
          );
        })}
      </Stack>
    </Spoiler>
  );
}

/** Element-level diff of two arrays of records sharing an identifying field. */
function KeyedArrayDiff({
  from,
  to,
  keyField,
}: {
  from: Record<string, unknown>[];
  to: Record<string, unknown>[];
  keyField: string;
}) {
  const fromMap = new Map(from.map((o) => [keyLabel(o[keyField]), o]));
  const toMap = new Map(to.map((o) => [keyLabel(o[keyField]), o]));
  const rows: SubRow[] = [];

  for (const [k, prev] of fromMap) {
    const next = toMap.get(k);
    if (next === undefined) {
      rows.push({
        key: k,
        kind: "removed",
        label: <SubKeyLabel keyField={keyField} id={k} />,
        // a removed dogma attribute renders its value formatted for its unit
        node:
          keyField === "attributeID" && typeof prev.value === "number" ? (
            <DogmaValue
              attributeId={Number(k)}
              value={prev.value}
              c="red"
              td="line-through"
            />
          ) : undefined,
        text: `(${restSummary(prev, keyField)})`,
      });
    } else if (JSON.stringify(prev) !== JSON.stringify(next)) {
      // Dogma attribute values get direction- + highIsGood-aware colouring.
      const node =
        keyField === "attributeID" &&
        typeof prev.value === "number" &&
        typeof next.value === "number" ? (
          <AttributeValueChange
            id={Number(k)}
            from={prev.value}
            to={next.value}
          />
        ) : undefined;
      rows.push({
        key: k,
        kind: "changed",
        label: <SubKeyLabel keyField={keyField} id={k} />,
        node,
        text: `: ${restSummary(prev, keyField)} → ${restSummary(next, keyField)}`,
      });
    }
  }
  for (const [k, next] of toMap) {
    if (!fromMap.has(k)) {
      rows.push({
        key: k,
        kind: "added",
        label: <SubKeyLabel keyField={keyField} id={k} />,
        // a newly-added dogma attribute renders its value formatted for its unit
        node:
          keyField === "attributeID" && typeof next.value === "number" ? (
            <DogmaValue attributeId={Number(k)} value={next.value} c="green" />
          ) : undefined,
        text: `(${restSummary(next, keyField)})`,
      });
    }
  }

  if (rows.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        entries reordered (no value changes)
      </Text>
    );
  }
  return <CappedRows rows={rows} />;
}

/** Set diff of two arrays of primitives. */
function PrimitiveArrayDiff({ from, to }: { from: unknown[]; to: unknown[] }) {
  const fromSet = new Set(from.map(keyLabel));
  const toSet = new Set(to.map(keyLabel));
  const rows: SubRow[] = [];
  for (const v of fromSet) {
    if (!toSet.has(v)) rows.push({ key: v, kind: "removed", text: v });
  }
  for (const v of toSet) {
    if (!fromSet.has(v)) rows.push({ key: v, kind: "added", text: v });
  }
  if (rows.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        entries reordered (no value changes)
      </Text>
    );
  }
  return <CappedRows rows={rows} />;
}

/** Recursive object/array diff: surfaces only the leaves that differ, by path. */
function DeepDiff({ from, to }: { from: unknown; to: unknown }) {
  const leaves = diffLeaves(from, to);
  if (leaves.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        reordered (no value changes)
      </Text>
    );
  }
  const rows: SubRow[] = leaves.map((leaf, i) => ({
    key: `${leaf.path.join(".")}-${i}`,
    kind: leaf.kind,
    label:
      leaf.path.length > 0 ? (
        <Text span size="xs" c="dimmed">
          {leaf.path.join(" › ")}
        </Text>
      ) : undefined,
    text:
      leaf.kind === "changed"
        ? `${formatValue(leaf.from)} → ${formatValue(leaf.to)}`
        : leaf.kind === "added"
          ? formatValue(leaf.to)
          : formatValue(leaf.from),
  }));
  return <CappedRows rows={rows} />;
}

/** Best-effort readable rendering for a changed field value. */
function SmartChanged({ delta }: { delta: FieldDelta }) {
  const { from, to } = delta;
  if (Array.isArray(from) && Array.isArray(to)) {
    const keyField = arrayKeyOf(from) ?? arrayKeyOf(to);
    if (keyField && from.every(isPlainObject) && to.every(isPlainObject)) {
      return <KeyedArrayDiff from={from} to={to} keyField={keyField} />;
    }
    if (!from.some(isPlainObject) && !to.some(isPlainObject)) {
      return <PrimitiveArrayDiff from={from} to={to} />;
    }
    return <DeepDiff from={from} to={to} />; // mixed array → recurse
  }
  if (isPlainObject(from) && isPlainObject(to)) {
    return <DeepDiff from={from} to={to} />;
  }
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm" c="red" style={{ textDecoration: "line-through" }}>
        {formatValue(from)}
      </Text>
      <Text size="sm">→</Text>
      <Text size="sm" c="green">
        {formatValue(to)}
      </Text>
    </Group>
  );
}

/** Field-delta cell: entity-aware for known metadata fields, generic otherwise. */
export function DeltaValue({
  field,
  delta,
  kind,
  entityType,
}: {
  field: string;
  delta: FieldDelta;
  kind: "added" | "removed" | "changed";
  entityType?: string;
}) {
  if (kind === "changed") {
    // Arrays diff better element-wise (added/removed entries) than as two whole
    // renders joined by an arrow — keep them on the SmartChanged path.
    if (Array.isArray(delta.from) || Array.isArray(delta.to)) {
      return <SmartChanged delta={delta} />;
    }
    const fromNode = entityValueFor(field, delta.from, entityType);
    const toNode = entityValueFor(field, delta.to, entityType);
    if (fromNode && toNode) {
      return (
        <Group gap={6} wrap="nowrap">
          <span style={{ textDecoration: "line-through", opacity: 0.65 }}>
            {fromNode}
          </span>
          <Text size="sm">→</Text>
          {toNode}
        </Group>
      );
    }
    return <SmartChanged delta={delta} />;
  }
  if (kind === "added") {
    return (
      entityValueFor(field, delta.to, entityType) ?? (
        <RichValue value={delta.to} />
      )
    );
  }
  // removed
  const node = entityValueFor(field, delta.from, entityType);
  if (node) {
    return (
      <span style={{ textDecoration: "line-through", opacity: 0.65 }}>
        {node}
      </span>
    );
  }
  return (
    <Text size="sm" c="red" style={{ textDecoration: "line-through" }}>
      {summarize(delta.from)}
    </Text>
  );
}

"use client";

import type { ReactNode } from "react";
import { Group, Spoiler, Stack, Text } from "@mantine/core";

import type { SubRow } from "./_diff";
import type { FieldDelta } from "~/lib/history";
import { formatValue } from "~/lib/history";
import {
  ID_LIST_COLLECTION_KIND,
  ID_LIST_FIELD_KIND,
  idFieldKind,
  isMessageField,
} from "~/lib/history-labels";
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
  EntityLabel,
  MessageLabel,
  SubKeyLabel,
} from "./_labels";
import { ISKAmount } from "./_sde-ui";

/**
 * The kind of entity each id is in a field holding a list of ids, or undefined
 * when the field's list is not one: the lists of {@link ID_LIST_FIELD_KIND}
 * (a skin's ship `types`, a type's `designerIDs`, a type list's includes and
 * excludes, …) and each level of a type's `masteries` (certificates).
 */
function idListKind(
  field: string,
  collection: string | undefined,
): string | undefined {
  return ID_LIST_FIELD_KIND[field] ?? ID_LIST_COLLECTION_KIND[collection ?? ""];
}

/** A capped, one-per-line list of labels (a skin's ships, a mastery's certificates). */
function LabelList({ ids, kind }: Readonly<{ ids: number[]; kind: string }>) {
  return (
    <Spoiler
      maxHeight={SPOILER_MAX_HEIGHT}
      showLabel={`Show all ${ids.length}`}
      hideLabel="Show less"
      fz="xs"
    >
      <Stack gap={1}>
        {ids.map((id) => (
          <Group gap={4} key={id}>
            <EntityLabel kind={kind} id={id} />
          </Group>
        ))}
      </Stack>
    </Spoiler>
  );
}

const isIdList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((v) => typeof v === "number");

/** Where a value sits: the entity being viewed, and the collection. */
export interface ValueContext {
  entityType?: string;
  entityId?: number;
  collection?: string;
}

/**
 * Entity-aware rendering for fields whose value is another entity's id, or a
 * localization message (the fields the server reads labels for: `idFieldKind`,
 * `ID_LIST_FIELD_KIND` and `isMessageField` in `~/lib/history-labels`).
 * Returns null when the field has no special meaning, and for a field holding
 * the viewed entity's own id (a type's `typeID`), which would only link the
 * page to itself.
 */
export function entityValueFor(
  field: string,
  value: unknown,
  { entityType, entityId, collection }: ValueContext = {},
): ReactNode | null {
  const listKind = idListKind(field, collection);
  // Link each id, so the list reads as named entities rather than a
  // comma-formatted "37,453".
  if (listKind && isIdList(value))
    return <LabelList ids={value} kind={listKind} />;
  if (typeof value !== "number") return null;
  if (field === "basePrice") return <ISKAmount span size="sm" amount={value} />;
  if (isMessageField(field)) return <MessageLabel id={value} size="sm" />;
  const kind = idFieldKind(field, collection);
  if (!kind || (kind === entityType && value === entityId)) return null;
  return <EntityLabel kind={kind} id={value} size="sm" />;
}

/**
 * Full rendering of a field value: keyed arrays of records become one named,
 * linked row per entry; everything else falls back to formatted text.
 */
export function RichValue({ value }: Readonly<{ value: unknown }>) {
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

/** Colour for a sub-row marker/text by its change kind. */
function rowColor(kind: SubRow["kind"]): string | undefined {
  if (kind === "added") return "green";
  if (kind === "removed") return "red";
  return undefined;
}

/** Leading marker glyph for a sub-row by its change kind. */
function rowMarker(kind: SubRow["kind"]): string {
  if (kind === "added") return "+";
  if (kind === "removed") return "−";
  return "~";
}

function CappedRows({ rows }: Readonly<{ rows: SubRow[] }>) {
  return (
    <Spoiler
      maxHeight={SPOILER_MAX_HEIGHT}
      showLabel={`Show all ${rows.length}`}
      hideLabel="Show less"
      fz="xs"
    >
      <Stack gap={1}>
        {rows.map((r) => {
          const color = rowColor(r.kind);
          const strike =
            r.kind === "removed"
              ? { textDecoration: "line-through" as const }
              : undefined;
          return (
            <Group gap={4} key={`${r.kind}-${r.key}`}>
              <Text size="xs" c={color}>
                {rowMarker(r.kind)}
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

/** Sub-row for an entry present in `from` but gone in `to`. */
function removedKeyedRow(
  keyField: string,
  k: string,
  prev: Record<string, unknown>,
): SubRow {
  return {
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
  };
}

/** Sub-row for an entry whose value changed between `from` and `to`. */
function changedKeyedRow(
  keyField: string,
  k: string,
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): SubRow {
  // Dogma attribute values get direction- + highIsGood-aware colouring.
  const node =
    keyField === "attributeID" &&
    typeof prev.value === "number" &&
    typeof next.value === "number" ? (
      <AttributeValueChange id={Number(k)} from={prev.value} to={next.value} />
    ) : undefined;
  return {
    key: k,
    kind: "changed",
    label: <SubKeyLabel keyField={keyField} id={k} />,
    node,
    text: `: ${restSummary(prev, keyField)} → ${restSummary(next, keyField)}`,
  };
}

/** Sub-row for an entry newly present in `to`. */
function addedKeyedRow(
  keyField: string,
  k: string,
  next: Record<string, unknown>,
): SubRow {
  return {
    key: k,
    kind: "added",
    label: <SubKeyLabel keyField={keyField} id={k} />,
    // a newly-added dogma attribute renders its value formatted for its unit
    node:
      keyField === "attributeID" && typeof next.value === "number" ? (
        <DogmaValue attributeId={Number(k)} value={next.value} c="green" />
      ) : undefined,
    text: `(${restSummary(next, keyField)})`,
  };
}

/** Element-level diff of two arrays of records sharing an identifying field. */
function KeyedArrayDiff({
  from,
  to,
  keyField,
}: Readonly<{
  from: Record<string, unknown>[];
  to: Record<string, unknown>[];
  keyField: string;
}>) {
  const fromMap = new Map(from.map((o) => [keyLabel(o[keyField]), o]));
  const toMap = new Map(to.map((o) => [keyLabel(o[keyField]), o]));
  const rows: SubRow[] = [];

  for (const [k, prev] of fromMap) {
    const next = toMap.get(k);
    if (next === undefined) {
      rows.push(removedKeyedRow(keyField, k, prev));
    } else if (JSON.stringify(prev) !== JSON.stringify(next)) {
      rows.push(changedKeyedRow(keyField, k, prev, next));
    }
  }
  for (const [k, next] of toMap) {
    if (!fromMap.has(k)) {
      rows.push(addedKeyedRow(keyField, k, next));
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

/** Set diff of two arrays of primitives, labelling each id when it is one. */
function PrimitiveArrayDiff({
  from,
  to,
  listKind,
}: Readonly<{
  from: unknown[];
  to: unknown[];
  listKind?: string;
}>) {
  const fromSet = new Set(from.map(keyLabel));
  const toSet = new Set(to.map(keyLabel));
  const row = (v: string, kind: "added" | "removed"): SubRow =>
    listKind && /^\d+$/.test(v)
      ? {
          key: v,
          kind,
          label: <EntityLabel kind={listKind} id={Number(v)} />,
          text: "",
        }
      : { key: v, kind, text: v };
  const rows: SubRow[] = [];
  for (const v of fromSet) {
    if (!toSet.has(v)) rows.push(row(v, "removed"));
  }
  for (const v of toSet) {
    if (!fromSet.has(v)) rows.push(row(v, "added"));
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

/** Text for a single diff leaf, formatted by its change kind. */
function leafText(leaf: ReturnType<typeof diffLeaves>[number]): string {
  if (leaf.kind === "changed") {
    return `${formatValue(leaf.from)} → ${formatValue(leaf.to)}`;
  }
  if (leaf.kind === "added") return formatValue(leaf.to);
  return formatValue(leaf.from);
}

/** Recursive object/array diff: surfaces only the leaves that differ, by path. */
function DeepDiff({ from, to }: Readonly<{ from: unknown; to: unknown }>) {
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
    text: leafText(leaf),
  }));
  return <CappedRows rows={rows} />;
}

/** Best-effort readable rendering for a changed field value. */
function SmartChanged({
  delta,
  listKind,
}: Readonly<{
  delta: FieldDelta;
  listKind?: string;
}>) {
  const { from, to } = delta;
  if (Array.isArray(from) && Array.isArray(to)) {
    const keyField = arrayKeyOf(from) ?? arrayKeyOf(to);
    if (keyField && from.every(isPlainObject) && to.every(isPlainObject)) {
      return <KeyedArrayDiff from={from} to={to} keyField={keyField} />;
    }
    if (!from.some(isPlainObject) && !to.some(isPlainObject)) {
      return <PrimitiveArrayDiff from={from} to={to} listKind={listKind} />;
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
  context = {},
}: Readonly<{
  field: string;
  delta: FieldDelta;
  kind: "added" | "removed" | "changed";
  context?: ValueContext;
}>) {
  if (kind === "changed") {
    // Arrays diff better element-wise (added/removed entries) than as two whole
    // renders joined by an arrow — keep them on the SmartChanged path.
    if (Array.isArray(delta.from) || Array.isArray(delta.to)) {
      return (
        <SmartChanged
          delta={delta}
          listKind={idListKind(field, context.collection)}
        />
      );
    }
    const fromNode = entityValueFor(field, delta.from, context);
    const toNode = entityValueFor(field, delta.to, context);
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
      entityValueFor(field, delta.to, context) ?? <RichValue value={delta.to} />
    );
  }
  // removed
  const node = entityValueFor(field, delta.from, context);
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

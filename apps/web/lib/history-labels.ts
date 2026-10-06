import type { EntityNames, EntityTimeline } from "~/lib/history";

/**
 * Everything an entity's change timeline needs to label the ids in its values,
 * read on the server with the timeline so the page arrives complete: every
 * label used to fetch itself, one server action per id, after the page loaded.
 *
 * Built from {@link collectLabelRefs}, which walks the same fields the
 * renderers in `app/history/_delta.tsx` and `_labels.tsx` label, so what the
 * server reads and what the page shows cannot drift apart.
 */
export interface HistoryLabels {
  /** Display names by entity kind and id ({@link EntityNames}). */
  names: EntityNames;
  /**
   * The breadcrumb parent of each labelled entity: a type's group, a group's
   * category, a market group's parent market group.
   */
  parents: {
    type: Record<number, number>;
    group: Record<number, number>;
    marketGroup: Record<number, number>;
  };
  /** What a dogma attribute's value needs: its unit, and which way is good. */
  attributes: Record<
    number,
    { unitId: number | null; highIsGood: boolean | null }
  >;
  /** The symbol a value in each unit is suffixed with ("m", "%", "ISK"). */
  unitSymbols: Record<number, string>;
}

export const EMPTY_HISTORY_LABELS: HistoryLabels = {
  names: {},
  parents: { type: {}, group: {}, marketGroup: {} },
  attributes: {},
  unitSymbols: {},
};

/** An entity a timeline's values refer to. */
export interface EntityRef {
  kind: string;
  id: number;
}

/**
 * Fields whose number is the id of another entity, by that entity's kind.
 * `typeID` is the viewed type's own id at the top of a type's record, but the
 * key of every entry in `typeMaterials`, `masteries`, … elsewhere.
 */
export const ID_FIELD_KIND: Readonly<Record<string, string>> = {
  typeID: "type",
  materialTypeID: "type",
  skillTypeID: "type",
  wreckTypeID: "type",
  variationParentTypeID: "type",
  groupID: "group",
  categoryID: "category",
  marketGroupID: "marketGroup",
  parentGroupID: "marketGroup",
  metaGroupID: "metaGroup",
  raceID: "race",
  factionID: "faction",
  attributeID: "dogmaAttribute",
  effectID: "dogmaEffect",
  unitID: "dogmaUnit",
  skinMaterialID: "skinMaterial",
};

/** Fields holding a list of ids of another entity, by that entity's kind. */
export const ID_LIST_FIELD_KIND: Readonly<Record<string, string>> = {
  types: "type",
  designerIDs: "npcCorporation",
};

/**
 * Collections whose field names are themselves ids: in
 * `requiredSkillsForTypes` each key is a skill's typeID.
 */
export const ID_KEYED_COLLECTION_KIND: Readonly<Record<string, string>> = {
  requiredSkillsForTypes: "type",
};

/**
 * Collections whose values are lists of ids: a type's `masteries` map each
 * mastery level to the certificates it needs.
 */
export const ID_LIST_COLLECTION_KIND: Readonly<Record<string, string>> = {
  masteries: "certificate",
};

/** The records an event's ids sit in: a modified field's `from` and `to` each
 * read as the field itself, `{ [field]: value }`. */
function recordsOf(
  event: EntityTimeline["events"][number],
): Record<string, unknown>[] {
  if (event.kind !== "modified") return [event.values ?? {}];
  return Object.entries(event.fields).flatMap(([field, delta]) => [
    { [field]: delta.from },
    { [field]: delta.to },
  ]);
}

/** Calls `add` for every id in the fields of `value`, at any depth. */
function visitIds(value: unknown, add: (kind: string, id: unknown) => void) {
  if (Array.isArray(value)) {
    for (const v of value) visitIds(v, add);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [field, v] of Object.entries(value)) {
    const kind = ID_FIELD_KIND[field];
    if (kind) add(kind, v);
    const listKind = ID_LIST_FIELD_KIND[field];
    if (listKind && Array.isArray(v)) for (const id of v) add(listKind, id);
    visitIds(v, add);
  }
}

/** Calls `add` for the ids `collection` implies by its shape alone. */
function visitCollectionIds(
  collection: string | undefined,
  record: Record<string, unknown>,
  add: (kind: string, id: unknown) => void,
) {
  const keyedKind = ID_KEYED_COLLECTION_KIND[collection ?? ""];
  const listKind = ID_LIST_COLLECTION_KIND[collection ?? ""];
  for (const [field, value] of Object.entries(record)) {
    if (keyedKind && /^\d+$/.test(field)) add(keyedKind, Number(field));
    if (listKind && Array.isArray(value))
      for (const id of value) add(listKind, id);
  }
}

/**
 * Every entity the timeline's values refer to, each once: the ids in the
 * fields of {@link ID_FIELD_KIND} and {@link ID_LIST_FIELD_KIND} at any depth,
 * plus the ids the collection itself implies
 * ({@link ID_KEYED_COLLECTION_KIND}, {@link ID_LIST_COLLECTION_KIND}).
 */
export function collectLabelRefs(timeline: EntityTimeline | null): EntityRef[] {
  const seen = new Map<string, EntityRef>();
  const add = (kind: string, id: unknown) => {
    if (typeof id !== "number" || !Number.isInteger(id)) return;
    seen.set(`${kind} ${id}`, { kind, id });
  };
  for (const event of timeline?.events ?? []) {
    for (const record of recordsOf(event)) {
      visitIds(record, add);
      visitCollectionIds(event.collection, record, add);
    }
  }
  return [...seen.values()];
}

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
  /**
   * The English text of each localization message the values refer to
   * ({@link isMessageField}), as of the entity's latest build.
   */
  messages: Record<number, string>;
}

export const EMPTY_HISTORY_LABELS: HistoryLabels = {
  names: {},
  parents: { type: {}, group: {}, marketGroup: {} },
  attributes: {},
  unitSymbols: {},
  messages: {},
};

/** The pseudo-kind {@link collectLabelRefs} files message ids under. */
export const MESSAGE_KIND = "message";

/** An entity a timeline's values refer to. */
export interface EntityRef {
  kind: string;
  id: number;
}

/**
 * Fields whose number is the id of another entity, by that entity's kind, in
 * every collection unless {@link COLLECTION_ID_FIELD_KIND} says otherwise. A
 * field naming the viewed entity itself (a type's own `typeID`) is left plain
 * by the renderer. Fields whose ids nothing names (`soundID`, `nebulaID`,
 * `isisGroupID`, `careerID`, …) are not listed.
 */
export const ID_FIELD_KIND: Readonly<Record<string, string>> = {
  typeID: "type",
  materialTypeID: "type",
  skillTypeID: "type",
  wreckTypeID: "type",
  variationParentTypeID: "type",
  blueprintTypeID: "type",
  compressedTypeID: "type",
  effectBeaconTypeID: "type",
  entryTypeID: "type",
  initialAgentGiftTypeID: "type",
  licenseTypeID: "type",
  shipTypeID: "type",
  sunTypeID: "type",
  groupID: "group",
  categoryID: "category",
  marketGroupID: "marketGroup",
  parentGroupID: "marketGroup",
  metaGroupID: "metaGroup",
  raceID: "race",
  bloodlineID: "bloodline",
  ancestryID: "ancestry",
  factionID: "faction",
  corporationID: "npcCorporation",
  militiaCorporationID: "npcCorporation",
  ownerID: "npcCorporation",
  enemyID: "npcCorporation",
  friendID: "npcCorporation",
  ceoID: "npcCharacter",
  mainActivityID: "corporationActivity",
  secondaryActivityID: "corporationActivity",
  agentTypeID: "agentType",
  schoolID: "school",
  attributeID: "dogmaAttribute",
  dischargeAttributeID: "dogmaAttribute",
  durationAttributeID: "dogmaAttribute",
  rangeAttributeID: "dogmaAttribute",
  maxAttributeID: "dogmaAttribute",
  minAttributeID: "dogmaAttribute",
  effectID: "dogmaEffect",
  unitID: "dogmaUnit",
  regionID: "region",
  constellationID: "constellation",
  solarSystemID: "solarSystem",
  planetID: "planet",
  stationID: "npcStation",
  operationID: "stationOperation",
  dungeonID: "dungeon",
  archetypeID: "archetype",
  allowedShipsTypeListID: "typeList",
  graphicID: "graphic",
  turretGraphicID: "graphic",
  iconID: "icon",
  skinID: "skin",
  skinMaterialID: "skinMaterial",
  materialSetID: "graphicMaterialSet",
};

/**
 * {@link ID_FIELD_KIND} overrides for the collections where a field means
 * something else: a dogma attribute's `categoryID` is its attribute category,
 * not an inventory category, and `activityID` is a corporation activity on a
 * station operation but an industry activity's own id.
 */
export const COLLECTION_ID_FIELD_KIND: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  dogmaAttributes: { categoryID: "dogmaAttributeCategory" },
  dogmaAttributeCategories: { categoryID: "dogmaAttributeCategory" },
  stationOperations: { activityID: "corporationActivity" },
  industryActivities: { activityID: "industryActivity" },
};

/** The kind of entity `field` holds the id of in `collection`, if any. */
export function idFieldKind(
  field: string,
  collection: string | undefined,
): string | undefined {
  return (
    COLLECTION_ID_FIELD_KIND[collection ?? "types"]?.[field] ??
    ID_FIELD_KIND[field]
  );
}

/** Fields holding a list of ids of another entity, by that entity's kind. */
export const ID_LIST_FIELD_KIND: Readonly<Record<string, string>> = {
  types: "type",
  includedTypeIDs: "type",
  excludedTypeIDs: "type",
  designerIDs: "npcCorporation",
  categoryIDs: "category",
  includedCategoryIDs: "category",
  excludedCategoryIDs: "category",
  groupIDs: "group",
  includedGroupIDs: "group",
  excludedGroupIDs: "group",
  constellationIDs: "constellation",
  solarSystemIDs: "solarSystem",
};

/**
 * Fields holding a localization message id, whose English text the page shows
 * in its place: every `…NameID`, and these.
 */
const MESSAGE_FIELDS: ReadonlySet<string> = new Set([
  "nameID",
  "descriptionID",
  "displayNameID",
  "displayDescriptionID",
  "characterDescriptionID",
  "entryJournalMessageID",
  "entryTypeDescriptionID",
  "gameplayDescriptionID",
  "missionBriefingID",
  "titleID",
  "tooltipDescriptionID",
  "tooltipTextID",
  "tooltipTitleID",
  "quoteID",
  "quoteAuthorID",
]);

/** Whether `field` holds a localization message id ({@link MESSAGE_FIELDS}). */
export const isMessageField = (field: string) =>
  field.endsWith("NameID") || MESSAGE_FIELDS.has(field);

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

/**
 * Calls `add` for every id in the fields of `value`, at any depth: entities by
 * kind, and localization messages under {@link MESSAGE_KIND}.
 */
function visitIds(
  value: unknown,
  collection: string | undefined,
  add: (kind: string, id: unknown) => void,
) {
  if (Array.isArray(value)) {
    for (const v of value) visitIds(v, collection, add);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [field, v] of Object.entries(value)) {
    const kind = idFieldKind(field, collection);
    if (kind) add(kind, v);
    if (isMessageField(field)) add(MESSAGE_KIND, v);
    const listKind = ID_LIST_FIELD_KIND[field];
    if (listKind && Array.isArray(v)) for (const id of v) add(listKind, id);
    visitIds(v, collection, add);
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
 * fields of {@link idFieldKind} and {@link ID_LIST_FIELD_KIND} at any depth,
 * the ids the collection itself implies ({@link ID_KEYED_COLLECTION_KIND},
 * {@link ID_LIST_COLLECTION_KIND}), and the localization messages in
 * {@link isMessageField} fields, under {@link MESSAGE_KIND}.
 */
export function collectLabelRefs(timeline: EntityTimeline | null): EntityRef[] {
  const seen = new Map<string, EntityRef>();
  const add = (kind: string, id: unknown) => {
    if (typeof id !== "number" || !Number.isInteger(id)) return;
    seen.set(`${kind} ${id}`, { kind, id });
  };
  for (const event of timeline?.events ?? []) {
    for (const record of recordsOf(event)) {
      visitIds(record, event.collection, add);
      visitCollectionIds(event.collection, record, add);
    }
  }
  return [...seen.values()];
}

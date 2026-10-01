import { dogmaAttributeDisplayValue } from "@jitaspace/ui";

import type { CatalogAttribute, CompareCatalog } from "./catalog";

/**
 * The comparison table as data: which rows exist, how they group, which value
 * in each row is best, and how every value moves against the baseline (the
 * first item). Kept free of React so the rules can be tested on their own.
 */

/** The ESI type fields the comparison reads. */
export interface CompareTypeData {
  dogma_attributes?: { attribute_id: number; value: number }[];
  capacity?: number;
  mass?: number;
  packaged_volume?: number;
  volume?: number;
}

/** Jita prices for one item; 0 means no orders on that side. */
export interface CompareMarketData {
  buy: number;
  sell: number;
}

export interface CompareItemInput {
  typeId: number;
  /** The ESI type; undefined while it loads. */
  type?: CompareTypeData;
  market?: CompareMarketData;
}

export type CompareRank = "best" | "worst";

export interface CompareCell {
  value?: number;
  /**
   * The item does not set this attribute, so `value` is the attribute's
   * default — what the game uses in its place.
   */
  isDefault?: boolean;
  /** For required-skill rows: the level the item requires. */
  level?: number;
  rank?: CompareRank;
  /** Change against the baseline's value, as a fraction: 0.19 is +19%. */
  delta?: number;
  /** Whether `delta` is an improvement; undefined when there is no "better". */
  deltaIsBetter?: boolean;
  /** The item's data has not arrived yet. */
  loading?: boolean;
}

export type CompareRowKind = "market" | "property" | "attribute";

export interface CompareRow {
  key: string;
  kind: CompareRowKind;
  label: string;
  /** The internal attribute name, when it differs from the label. */
  name?: string;
  attributeId?: number;
  iconId?: number;
  unitId?: number;
  unitSymbol?: string;
  /** Value is a price, rendered as ISK. */
  isk?: boolean;
  cells: CompareCell[];
  /** Whether at least two loaded items disagree. */
  differs: boolean;
  /** Not shown by the EVE client; only listed with "hidden attributes" on. */
  hidden: boolean;
}

export interface CompareSection {
  key: string;
  label: string;
  rows: CompareRow[];
  /**
   * Rows the section has before the differences filter and the text filter,
   * so its heading can say "2 of 9" when some are hidden.
   */
  totalRows?: number;
}

export interface CompareOptions {
  /** Drop rows where every item has the same value. Needs two items. */
  onlyDifferences: boolean;
  /** Include attributes the EVE client does not show. */
  showHidden: boolean;
  /** Keep rows whose label, name or section matches. */
  filter: string;
}

export interface Comparison {
  sections: CompareSection[];
  /** Rows before `onlyDifferences` and `filter` were applied. */
  totalRows: number;
  /** Rows after every option was applied. */
  shownRows: number;
  /** Rows dropped only because every item agrees. */
  identicalRows: number;
}

/** Dogma attribute category id of the required-skill attributes. */
const REQUIRED_SKILLS_CATEGORY_ID = 8;

/** Required-skill attribute → the attribute holding its required level. */
export const SKILL_LEVEL_ATTRIBUTE_IDS: ReadonlyMap<number, number> = new Map([
  [182, 277],
  [183, 278],
  [184, 279],
  [1285, 1286],
  [1289, 1287],
  [1290, 1288],
]);

/**
 * Units whose value is an identifier, flag or size class: no larger-is-better
 * reading, and no meaningful percentage change.
 */
const NON_NUMERIC_UNIT_IDS = new Set([
  115, // groupID
  116, // typeID
  117, // Sizeclass
  119, // attributeID
  137, // Boolean
  140, // Level
  142, // Sex
  143, // Datetime
]);

/** Units whose value is the id of another entity; their default is not one. */
export const REFERENCE_UNIT_IDS: ReadonlySet<number> = new Set([115, 116, 119]);

/**
 * Units already expressed as a percentage. A relative change of a percentage
 * ("+25%" for 40% → 50% resistance) reads as the absolute one, so they get
 * no delta; the best/worst highlight still applies.
 */
const PERCENT_UNIT_IDS = new Set([105, 108, 109, 111, 121, 124, 127, 205]);

/**
 * Display order of dogma attribute categories: fitting first, then the tank
 * layers from the outside in, then everything a pilot compares less often.
 * Categories not listed follow in id order.
 */
const CATEGORY_ORDER = [
  1, // Fitting
  2, // Shield
  3, // Armor
  4, // Structure
  5, // Capacitor
  6, // Targeting
  17, // Speed and Travel
  29, // Turrets
  30, // Missile
  10, // Drones
  38, // Fighter Attributes
  34, // Fighter Abilities
  40, // Hangars & Bays
  51, // Mining
  20, // Remote Assistance
  21, // EW - Target Painting
  22, // EW - Energy Neutralizing
  24, // EW - Sensor Dampening
  25, // EW - Target Jamming
  26, // EW - Tracking Disruption
  27, // EW - Warp Scrambling
  28, // EW - Webbing
  36, // EW - Resistance
  39, // Superweapons
  52, // Heat
  37, // Bonuses
  8, // Required Skills
  7, // Miscellaneous
  12, // AI
  31, // Graphics
];

/**
 * Dogma attributes ESI repeats from the type itself — mass (4), capacity (38)
 * and volume (161). The Properties section already shows them; as attributes
 * they would appear twice, and under the SDE's default "higher is better" the
 * heaviest hull would be marked best.
 */
const PROPERTY_ATTRIBUTE_IDS = new Set([4, 38, 161]);

/**
 * Costs and delays the SDE marks `highIsGood: true` — its default — although
 * less is plainly better. Without this the drone needing the most bandwidth,
 * or the rig with the highest calibration cost, would be highlighted as best.
 * Only unambiguous cases are listed; the rest keep the SDE's flag.
 */
const LOWER_IS_BETTER_ATTRIBUTE_IDS = new Set([
  506, // Rate of fire (missile launch duration)
  556, // Anchoring Delay
  676, // Unanchoring Delay
  677, // Onlining Delay
  785, // Unfitting Capacitor Cost
  1005, // Jump portal activation cost
  1153, // Calibration cost
  1221, // Jump Delay Duration
  1272, // Bandwidth Needed
  1634, // CPU Usage (per km)
]);

/** Category 9 is literally named "NULL" in the SDE. */
const NULL_CATEGORY_ID = 9;
const OTHER_SECTION_KEY = "other";

interface RowSpec {
  key: string;
  kind: CompareRowKind;
  label: string;
  name?: string;
  attributeId?: number;
  iconId?: number;
  unitId?: number;
  unitSymbol?: string;
  isk?: boolean;
  hidden: boolean;
  /** Whether a larger value is better; undefined when neither is. */
  highIsGood?: boolean;
  /** Whether a relative change is meaningful. */
  hasDelta: boolean;
  read: (item: CompareItemInput) => number | undefined;
  /** Used, and flagged as such, where `read` finds nothing. */
  defaultValue?: number;
  readLevel?: (item: CompareItemInput) => number | undefined;
  /** Whether the item's source for this row has arrived. */
  isLoaded: (item: CompareItemInput) => boolean;
}

const typeLoaded = (item: CompareItemInput) => item.type !== undefined;

function attributeValue(
  item: CompareItemInput,
  attributeId: number,
): number | undefined {
  return item.type?.dogma_attributes?.find(
    (attribute) => attribute.attribute_id === attributeId,
  )?.value;
}

/** Whether the attribute is one the EVE client shows. */
export function isVisibleAttribute(
  attribute: CatalogAttribute | undefined,
): boolean {
  return attribute?.published === true && attribute.displayName !== undefined;
}

function attributeRowSpec(
  attributeId: number,
  attribute: CatalogAttribute | undefined,
  unitSymbols: CompareCatalog["unitSymbols"],
): RowSpec {
  const unitId = attribute?.unitId;
  const visible = isVisibleAttribute(attribute);
  const numeric = unitId === undefined || !NON_NUMERIC_UNIT_IDS.has(unitId);
  const unitSymbol = unitId === undefined ? undefined : unitSymbols[unitId];
  const isPercent =
    (unitId !== undefined && PERCENT_UNIT_IDS.has(unitId)) ||
    unitSymbol === "%";
  // The SDE defaults highIsGood to true, so it is only trusted where CCP
  // curated the attribute for display — and never for skill requirements.
  const ranked =
    visible &&
    numeric &&
    attribute?.categoryId !== REQUIRED_SKILLS_CATEGORY_ID &&
    attribute?.highIsGood !== undefined;
  const levelAttributeId = SKILL_LEVEL_ATTRIBUTE_IDS.get(attributeId);
  const label =
    attribute?.displayName ?? attribute?.name ?? `Attribute ${attributeId}`;

  return {
    key: `attribute:${attributeId}`,
    kind: "attribute",
    label,
    name:
      attribute?.name !== undefined && attribute.name !== label
        ? attribute.name
        : undefined,
    attributeId,
    iconId: attribute?.iconId,
    unitId,
    unitSymbol,
    hidden: !visible,
    highIsGood: ranked
      ? attribute.highIsGood === true &&
        !LOWER_IS_BETTER_ATTRIBUTE_IDS.has(attributeId)
      : undefined,
    hasDelta: numeric && !isPercent,
    read: (item) => attributeValue(item, attributeId),
    defaultValue:
      unitId !== undefined && REFERENCE_UNIT_IDS.has(unitId)
        ? undefined
        : attribute?.defaultValue,
    readLevel:
      levelAttributeId === undefined
        ? undefined
        : (item) => attributeValue(item, levelAttributeId),
    isLoaded: typeLoaded,
  };
}

function positive(value: number | undefined): number | undefined {
  return value !== undefined && value > 0 ? value : undefined;
}

const MARKET_ROWS: RowSpec[] = [
  {
    key: "market:sell",
    kind: "market",
    label: "Jita sell",
    isk: true,
    hidden: false,
    highIsGood: false,
    hasDelta: true,
    read: (item) => positive(item.market?.sell),
    isLoaded: (item) => item.market !== undefined,
  },
  {
    key: "market:buy",
    kind: "market",
    label: "Jita buy",
    isk: true,
    hidden: false,
    hasDelta: true,
    read: (item) => positive(item.market?.buy),
    isLoaded: (item) => item.market !== undefined,
  },
];

const PROPERTY_ROWS: RowSpec[] = [
  {
    key: "property:capacity",
    kind: "property",
    label: "Capacity",
    unitSymbol: "m3",
    hidden: false,
    highIsGood: true,
    hasDelta: true,
    read: (item) => positive(item.type?.capacity),
    isLoaded: typeLoaded,
  },
  {
    key: "property:volume",
    kind: "property",
    label: "Volume",
    unitSymbol: "m3",
    hidden: false,
    hasDelta: true,
    read: (item) => item.type?.volume,
    isLoaded: typeLoaded,
  },
  {
    key: "property:packaged_volume",
    kind: "property",
    label: "Packaged volume",
    unitSymbol: "m3",
    hidden: false,
    hasDelta: true,
    read: (item) => item.type?.packaged_volume,
    isLoaded: typeLoaded,
  },
  {
    key: "property:mass",
    kind: "property",
    label: "Mass",
    unitSymbol: "kg",
    hidden: false,
    hasDelta: true,
    read: (item) => positive(item.type?.mass),
    isLoaded: typeLoaded,
  },
];

/** The value two cells must share to count as "the same". */
function cellKey(cell: CompareCell): string {
  return `${cell.value ?? "-"}:${cell.level ?? "-"}`;
}

function buildRow(spec: RowSpec, items: CompareItemInput[]): CompareRow {
  const cells: CompareCell[] = items.map((item) => {
    if (!spec.isLoaded(item)) return { loading: true };
    const value = spec.read(item);
    if (value === undefined && spec.defaultValue !== undefined) {
      return { value: spec.defaultValue, isDefault: true };
    }
    return { value, level: spec.readLevel?.(item) };
  });

  const loadedCells = cells.filter((cell) => !cell.loading);
  const differs = new Set(loadedCells.map(cellKey)).size > 1;

  // A default stands in for an attribute the item does not have at all — a
  // launcher's turret tracking, a module's capacitor need — so it is shown,
  // but neither ranked nor measured against: "0 m optimal, −100%" on a
  // launcher next to a railgun is not a comparison.
  const values = cells.flatMap((cell) =>
    cell.value === undefined || cell.isDefault ? [] : [cell.value],
  );
  const { highIsGood } = spec;
  if (highIsGood !== undefined && new Set(values).size > 1) {
    const best = highIsGood ? Math.max(...values) : Math.min(...values);
    const worst = highIsGood ? Math.min(...values) : Math.max(...values);
    for (const cell of cells) {
      if (cell.isDefault) continue;
      if (cell.value === best) cell.rank = "best";
      else if (cell.value === worst) cell.rank = "worst";
    }
  }

  const baseline = cells[0]?.isDefault ? undefined : cells[0]?.value;
  if (spec.hasDelta && baseline !== undefined) {
    const baselineDisplay = dogmaAttributeDisplayValue(baseline, spec.unitId);
    for (const cell of cells.slice(1)) {
      if (cell.value === undefined || cell.isDefault) continue;
      if (cell.value === baseline) continue;
      if (baselineDisplay === 0) continue;
      const display = dogmaAttributeDisplayValue(cell.value, spec.unitId);
      cell.delta = (display - baselineDisplay) / Math.abs(baselineDisplay);
      if (highIsGood !== undefined) {
        cell.deltaIsBetter = highIsGood
          ? cell.value > baseline
          : cell.value < baseline;
      }
    }
  }

  return {
    key: spec.key,
    kind: spec.kind,
    label: spec.label,
    name: spec.name,
    attributeId: spec.attributeId,
    iconId: spec.iconId,
    unitId: spec.unitId,
    unitSymbol: spec.unitSymbol,
    isk: spec.isk,
    cells,
    differs,
    hidden: spec.hidden,
  };
}

function categorySectionKey(categoryId: number | undefined): string {
  return categoryId === undefined || categoryId === NULL_CATEGORY_ID
    ? OTHER_SECTION_KEY
    : `category:${categoryId}`;
}

function categoryRank(categoryId: number | undefined): number {
  if (categoryId === undefined || categoryId === NULL_CATEGORY_ID) {
    return Number.MAX_SAFE_INTEGER;
  }
  const index = CATEGORY_ORDER.indexOf(categoryId);
  return index === -1 ? CATEGORY_ORDER.length + categoryId : index;
}

/**
 * Build the attribute sections: one per dogma attribute category any item
 * uses, in {@link CATEGORY_ORDER}, each sorted by attribute id (which keeps
 * families such as the four resistances together).
 */
function buildAttributeSections(
  items: CompareItemInput[],
  catalog: Pick<
    CompareCatalog,
    "attributes" | "attributeCategories" | "unitSymbols"
  >,
): CompareSection[] {
  const attributeIds = new Set<number>();
  for (const item of items) {
    for (const attribute of item.type?.dogma_attributes ?? []) {
      if (!PROPERTY_ATTRIBUTE_IDS.has(attribute.attribute_id)) {
        attributeIds.add(attribute.attribute_id);
      }
    }
  }

  const sections = new Map<
    string,
    { categoryId?: number; section: CompareSection }
  >();
  for (const attributeId of [...attributeIds].sort((a, b) => a - b)) {
    const attribute = catalog.attributes[attributeId];
    const categoryId = attribute?.categoryId;
    const key = categorySectionKey(categoryId);
    let entry = sections.get(key);
    if (!entry) {
      entry = {
        categoryId: key === OTHER_SECTION_KEY ? undefined : categoryId,
        section: {
          key,
          label:
            key === OTHER_SECTION_KEY || categoryId === undefined
              ? "Other"
              : (catalog.attributeCategories[categoryId] ??
                `Category ${categoryId}`),
          rows: [],
        },
      };
      sections.set(key, entry);
    }
    entry.section.rows.push(
      buildRow(
        attributeRowSpec(attributeId, attribute, catalog.unitSymbols),
        items,
      ),
    );
  }

  return [...sections.values()]
    .sort((a, b) => categoryRank(a.categoryId) - categoryRank(b.categoryId))
    .map(({ section }) => section);
}

function matchesFilter(
  row: CompareRow,
  section: CompareSection,
  needle: string,
): boolean {
  return [row.label, row.name, section.label].some((text) =>
    text?.toLowerCase().includes(needle),
  );
}

/** Build the comparison of `items`, the first being the baseline. */
export function buildComparison(
  items: CompareItemInput[],
  catalog: Pick<
    CompareCatalog,
    "attributes" | "attributeCategories" | "unitSymbols"
  >,
  options: CompareOptions,
): Comparison {
  const allSections: CompareSection[] = [
    {
      key: "market",
      label: "Market (Jita)",
      rows: MARKET_ROWS.map((spec) => buildRow(spec, items)),
    },
    {
      key: "properties",
      label: "Properties",
      rows: PROPERTY_ROWS.map((spec) => buildRow(spec, items)),
    },
    ...buildAttributeSections(items, catalog),
  ];

  const needle = options.filter.trim().toLowerCase();
  const onlyDifferences = options.onlyDifferences && items.length > 1;
  let totalRows = 0;
  let shownRows = 0;
  let identicalRows = 0;

  const sections = allSections.flatMap((section) => {
    let sectionTotal = 0;
    const rows = section.rows.filter((row) => {
      // A row every item lacks (no market, no capacity) is noise, not data.
      if (row.cells.every((cell) => !cell.loading && cell.value === undefined))
        return false;
      if (row.hidden && !options.showHidden) return false;
      totalRows += 1;
      sectionTotal += 1;
      if (needle && !matchesFilter(row, section, needle)) return false;
      if (onlyDifferences && !row.differs) {
        identicalRows += 1;
        return false;
      }
      shownRows += 1;
      return true;
    });
    return rows.length > 0
      ? [{ ...section, rows, totalRows: sectionTotal }]
      : [];
  });

  return { sections, totalRows, shownRows, identicalRows };
}

import type { CharacterAsset } from "@jitaspace/hooks";

/**
 * Minimal shape of the market-price index returned by `useMarketPrices`.
 * Keyed by `type_id`; only the adjusted price is relevant for valuation.
 */
export type MarketPriceIndex = Record<
  string | number,
  { adjusted_price?: number } | undefined
>;

/** A single location (station / structure / solar system) holding top-level assets. */
export interface AssetLocationSummary {
  locationId: number;
  /** Total number of item stacks anywhere under this location (all depths). */
  stacks: number;
  /** Total estimated ISK value of everything under this location. */
  value: number;
  /** Items that sit directly in this location (their own contents are nested). */
  directItems: CharacterAsset[];
}

/**
 * The fully indexed asset hierarchy. Everything the UI needs to render a
 * browsable tree without re-walking the flat list.
 */
export interface AssetTree {
  /** Root locations, sorted by total value descending. */
  locations: AssetLocationSummary[];
  /** parent item_id (a ship/container) → its direct child assets. */
  childrenByParent: Map<number, CharacterAsset[]>;
  /** item_id → the asset. */
  assetById: Map<number, CharacterAsset>;
  /** item_id → aggregated ISK value of the item and everything inside it. */
  subtreeValue: Map<number, number>;
  /** item_id → number of stacks in its subtree, including itself. */
  subtreeStacks: Map<number, number>;
  /** item_id → the root location_id it ultimately lives in. */
  rootLocationOf: Map<number, number>;
  /** Grand total ISK value across every asset. */
  totalValue: number;
  /** Total number of item stacks. */
  totalStacks: number;
}

const unitValue = (
  marketPrices: MarketPriceIndex,
  asset: CharacterAsset,
): number => (marketPrices[asset.type_id]?.adjusted_price ?? 0) * asset.quantity;

function pushInto<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}

/**
 * Turn the flat asset list from ESI into an indexed, browsable tree.
 *
 * EVE assets form a forest: an asset is nested inside another when its
 * `location_id` equals a parent asset's `item_id`. Any asset whose
 * `location_id` is *not* one of our own item ids sits directly in a location
 * (a station, structure or solar system) and is therefore a tree root.
 */
export function buildAssetTree(
  assets: Record<string, CharacterAsset>,
  marketPrices: MarketPriceIndex,
): AssetTree {
  const all = Object.values(assets);

  const assetById = new Map<number, CharacterAsset>();
  const itemIds = new Set<number>();
  for (const asset of all) {
    assetById.set(asset.item_id, asset);
    itemIds.add(asset.item_id);
  }

  // Group every asset under whatever it lives in (a location or a container).
  const childrenByParent = new Map<number, CharacterAsset[]>();
  for (const asset of all) {
    pushInto(childrenByParent, asset.location_id, asset);
  }

  // Root locations are parents that are not themselves items we own.
  const rootLocationIds = [...childrenByParent.keys()].filter(
    (id) => !itemIds.has(id),
  );

  // Aggregate value + stack counts bottom-up, memoised, with a cycle guard.
  const subtreeValue = new Map<number, number>();
  const subtreeStacks = new Map<number, number>();
  const computeSubtree = (
    asset: CharacterAsset,
    inProgress: Set<number>,
  ): void => {
    if (subtreeValue.has(asset.item_id) || inProgress.has(asset.item_id)) return;
    inProgress.add(asset.item_id);
    let value = unitValue(marketPrices, asset);
    let stacks = 1;
    for (const child of childrenByParent.get(asset.item_id) ?? []) {
      computeSubtree(child, inProgress);
      value += subtreeValue.get(child.item_id) ?? 0;
      stacks += subtreeStacks.get(child.item_id) ?? 0;
    }
    inProgress.delete(asset.item_id);
    subtreeValue.set(asset.item_id, value);
    subtreeStacks.set(asset.item_id, stacks);
  };
  for (const asset of all) computeSubtree(asset, new Set());

  // Resolve the ultimate root location for every asset by walking up parents.
  const rootLocationOf = new Map<number, number>();
  const resolveRoot = (asset: CharacterAsset): number => {
    const path: number[] = [];
    let current = asset;
    const guard = new Set<number>();
    while (itemIds.has(current.location_id) && !guard.has(current.item_id)) {
      guard.add(current.item_id);
      path.push(current.item_id);
      const parent = assetById.get(current.location_id);
      if (!parent) break;
      current = parent;
    }
    const root = current.location_id;
    for (const id of path) rootLocationOf.set(id, root);
    rootLocationOf.set(asset.item_id, root);
    return root;
  };
  for (const asset of all) {
    if (!rootLocationOf.has(asset.item_id)) resolveRoot(asset);
  }

  const locations: AssetLocationSummary[] = rootLocationIds
    .map((locationId) => {
      const directItems = childrenByParent.get(locationId) ?? [];
      let value = 0;
      let stacks = 0;
      for (const item of directItems) {
        value += subtreeValue.get(item.item_id) ?? 0;
        stacks += subtreeStacks.get(item.item_id) ?? 0;
      }
      return { locationId, directItems, value, stacks };
    })
    .sort((a, b) => b.value - a.value || b.stacks - a.stacks);

  const totalValue = all.reduce(
    (acc, asset) => acc + unitValue(marketPrices, asset),
    0,
  );

  return {
    locations,
    childrenByParent,
    assetById,
    subtreeValue,
    subtreeStacks,
    rootLocationOf,
    totalValue,
    totalStacks: all.length,
  };
}

/** A human-facing grouping of assets sharing a `location_flag` "section". */
export interface AssetSection {
  key: string;
  label: string;
  order: number;
}

/** Convert a raw ESI `location_flag` into a friendly, sortable section. */
export function assetSection(flag: string): AssetSection {
  const slot = /^(HiSlot|MedSlot|LoSlot|RigSlot|SubSystemSlot|ServiceSlot)\d+$/.exec(
    flag,
  );
  if (slot) {
    switch (slot[1]) {
      case "HiSlot":
        return { key: "hi", label: "High Slots", order: 10 };
      case "MedSlot":
        return { key: "med", label: "Mid Slots", order: 11 };
      case "LoSlot":
        return { key: "lo", label: "Low Slots", order: 12 };
      case "RigSlot":
        return { key: "rig", label: "Rig Slots", order: 13 };
      case "SubSystemSlot":
        return { key: "sub", label: "Subsystems", order: 14 };
      default:
        return { key: "svc", label: "Service Slots", order: 15 };
    }
  }
  if (/^FighterTube\d+$/.test(flag)) {
    return { key: "fighter", label: "Fighter Bay", order: 22 };
  }
  switch (flag) {
    case "Hangar":
      return { key: "hangar", label: "Hangar", order: 0 };
    case "Deliveries":
      return { key: "deliveries", label: "Deliveries", order: 1 };
    case "AssetSafety":
      return { key: "assetSafety", label: "Asset Safety", order: 2 };
    case "ShipHangar":
      return { key: "shipHangar", label: "Ship Hangar", order: 3 };
    case "FleetHangar":
      return { key: "fleetHangar", label: "Fleet Hangar", order: 20 };
    case "DroneBay":
      return { key: "droneBay", label: "Drone Bay", order: 21 };
    case "FighterBay":
      return { key: "fighterBay", label: "Fighter Bay", order: 22 };
    case "Cargo":
      return { key: "cargo", label: "Cargo Hold", order: 30 };
    case "Locked":
    case "Unlocked":
      return { key: "contents", label: "Contents", order: 40 };
    default:
      return { key: flag, label: humanizeFlag(flag), order: 35 };
  }
}

/** Best-effort humanisation of an unmapped flag, e.g. `SpecializedOreHold` → `Ore Hold`. */
export function humanizeFlag(flag: string): string {
  // Strip trailing digits without an un-anchored `\d+$` regex, whose multiple
  // start positions give it super-linear backtracking on long inputs.
  let end = flag.length;
  while (end > 0) {
    const code = flag.charCodeAt(end - 1);
    if (code < 48 || code > 57) break;
    end -= 1;
  }
  const cleaned = flag
    .slice(0, end)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^Specialized /, "")
    .trim();
  return cleaned.length > 0 ? cleaned : flag;
}

/** A section together with the assets that fall under it. */
export interface AssetSectionGroup extends AssetSection {
  items: CharacterAsset[];
}

/**
 * Group a set of sibling assets by their section, ordered the way a capsuleer
 * expects (high → mid → low → rigs → bays → cargo). Items within a section are
 * ordered by descending value so the valuable stuff surfaces first.
 */
export function groupBySection(
  items: CharacterAsset[],
  valueOf: (itemId: number) => number,
): AssetSectionGroup[] {
  const groups = new Map<string, AssetSectionGroup>();
  for (const item of items) {
    const section = assetSection(item.location_flag);
    const group = groups.get(section.key);
    if (group) group.items.push(item);
    else groups.set(section.key, { ...section, items: [item] });
  }
  const ordered = [...groups.values()].sort(
    (a, b) => a.order - b.order || a.label.localeCompare(b.label),
  );
  for (const group of ordered) {
    group.items.sort(
      (a, b) => valueOf(b.item_id) - valueOf(a.item_id) || a.type_id - b.type_id,
    );
  }
  return ordered;
}

/**
 * Whether a set of section groups should be rendered as a plain list (no
 * sub-headers). True when everything sits in a single generic bucket such as a
 * station hangar or an unnamed container — sub-headers there would be noise.
 */
export function isFlatSectioning(groups: AssetSectionGroup[]): boolean {
  return (
    groups.length <= 1 &&
    (groups[0] === undefined ||
      groups[0].key === "hangar" ||
      groups[0].key === "contents")
  );
}

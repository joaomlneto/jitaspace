"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Skeleton,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";

import {
  useFuzzworkRegionalMarketAggregates,
  useTypes,
} from "@jitaspace/hooks";

import type { CompareItemInput, CompareMarketData } from "./comparison";
import { CompareItemPicker } from "./CompareItemPicker";
import { CompareTable } from "./CompareTable";
import { CompareToolbar } from "./CompareToolbar";
import { buildComparison } from "./comparison";
import { suggestSameGroupTypes } from "./search";
import { useCompareCatalog } from "./useCompareCatalog";

/** The Forge — the region containing Jita, EVE's main trade hub. */
const THE_FORGE_REGION_ID = 10000002;

/**
 * Most items one comparison holds. Each is an ESI request and a table column;
 * past a dozen the columns are too narrow to read anyway.
 */
export const MAX_COMPARE_ITEMS = 12;

const NO_ORDERS: CompareMarketData = { buy: 0, sell: 0 };
const NO_TYPE_IDS: number[] = [];

const EMPTY_CATALOG = {
  attributes: {},
  attributeCategories: {},
  unitSymbols: {},
};

/** Positive, distinct and at most `max`, order kept. */
export function normalizeTypeIds(
  typeIds: readonly number[],
  max: number = MAX_COMPARE_ITEMS,
): number[] {
  return [...new Set(typeIds.filter((typeId) => typeId > 0))].slice(0, max);
}

/** "Comparing 3 items", for announcements. */
export function itemCount(count: number): string {
  if (count === 0) return "Nothing left to compare";
  return `Comparing ${count} ${count === 1 ? "item" : "items"}`;
}

/** `typeIds` with `typeId` moved to position `index`. */
export function moveTypeId(
  typeIds: readonly number[],
  typeId: number,
  index: number,
): number[] {
  const rest = typeIds.filter((id) => id !== typeId);
  if (rest.length === typeIds.length) return [...typeIds];
  const target = Math.min(Math.max(index, 0), rest.length);
  return [...rest.slice(0, target), typeId, ...rest.slice(target)];
}

/** Where an added item was picked from. */
export type CompareAddSource = "search" | "suggestion";

export interface CompareItemsAddedEvent {
  /** The whole selection after the addition, in column order. */
  typeIds: number[];
  /** The items just added. */
  added: number[];
  source: CompareAddSource;
}

export interface ItemComparisonProps {
  /** The compared items, in column order; the first is the baseline. */
  typeIds?: number[];
  /** Initial items when `typeIds` is not controlled. */
  defaultTypeIds?: number[];
  /** Called with the new selection whenever it changes. */
  onTypeIdsChange?: (typeIds: number[]) => void;
  /**
   * Whether the reader can add, remove and reorder items. Turn it off to show
   * a fixed comparison — a doctrine's hulls, say, or an LP store's offers.
   * Default `true`.
   */
  editable?: boolean;
  /** Show the differences / filter / hidden-attributes bar. Default `true`. */
  withToolbar?: boolean;
  /** Start with only the rows that differ. Default `true`. */
  defaultOnlyDifferences?: boolean;
  /** Start with attributes the game does not show. Default `false`. */
  defaultShowHidden?: boolean;
  /** Most items the selection can hold. Default {@link MAX_COMPARE_ITEMS}. */
  maxItems?: number;
  /** Cap on the table's height; it scrolls inside. Default fills the viewport. */
  maxHeight?: CSSProperties["maxHeight"];
  /** Shown under the add box while nothing is selected (e.g. presets). */
  emptyState?: ReactNode;
  /** Called when the reader adds items, e.g. for analytics. */
  onItemsAdded?: (event: CompareItemsAddedEvent) => void;
}

/**
 * A complete, self-contained item comparison: it loads the catalog, the items'
 * attributes and their Jita prices itself, and renders the toolbar, the table
 * and the add box. Use it anywhere items should be compared side by side.
 *
 * Controlled (`typeIds` + `onTypeIdsChange`, as the /compare page does to keep
 * the selection in the URL) or uncontrolled (`defaultTypeIds`).
 *
 * @example A fixed comparison
 * <ItemComparison defaultTypeIds={[587, 585, 598]} editable={false} />
 */
export function ItemComparison({
  typeIds: controlledTypeIds,
  defaultTypeIds,
  onTypeIdsChange,
  editable = true,
  withToolbar = true,
  defaultOnlyDifferences = true,
  defaultShowHidden = false,
  maxItems = MAX_COMPARE_ITEMS,
  maxHeight,
  emptyState,
  onItemsAdded,
}: Readonly<ItemComparisonProps>) {
  const [rawTypeIds, setRawTypeIds] = useUncontrolled<number[]>({
    value: controlledTypeIds,
    defaultValue: defaultTypeIds,
    finalValue: NO_TYPE_IDS,
    onChange: onTypeIdsChange,
  });
  const typeIds = useMemo(
    () => normalizeTypeIds(rawTypeIds, maxItems),
    [rawTypeIds, maxItems],
  );

  const [onlyDifferences, setOnlyDifferences] = useState(
    defaultOnlyDifferences,
  );
  const [showHidden, setShowHidden] = useState(defaultShowHidden);
  const [filter, setFilter] = useState("");

  const {
    catalog,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useCompareCatalog();
  const { data: types } = useTypes(typeIds);
  const { data: marketAggregates, isError: isMarketError } =
    useFuzzworkRegionalMarketAggregates(typeIds, THE_FORGE_REGION_ID);

  const items = useMemo<CompareItemInput[]>(
    () =>
      typeIds.map((typeId) => {
        const aggregate = marketAggregates?.[typeId];
        let market: CompareMarketData | undefined;
        if (aggregate) {
          market = {
            buy: aggregate.buy.percentile,
            sell: aggregate.sell.percentile,
          };
        } else if (marketAggregates || isMarketError) {
          market = NO_ORDERS;
        }
        return { typeId, type: types[typeId], market };
      }),
    [typeIds, types, marketAggregates, isMarketError],
  );

  const comparison = useMemo(
    () =>
      buildComparison(items, catalog ?? EMPTY_CATALOG, {
        onlyDifferences,
        showHidden,
        filter,
      }),
    [items, catalog, onlyDifferences, showHidden, filter],
  );

  const groupIds = useMemo(
    () =>
      Object.fromEntries(
        typeIds.map((typeId) => [typeId, types[typeId]?.group_id]),
      ),
    [typeIds, types],
  );

  const nameOf = useCallback(
    (typeId: number) =>
      catalog?.typesById.get(typeId)?.name ??
      types[typeId]?.name ??
      `item ${typeId}`,
    [catalog, types],
  );
  const names = useMemo(
    () => Object.fromEntries(typeIds.map((typeId) => [typeId, nameOf(typeId)])),
    [typeIds, nameOf],
  );

  // Adding, removing and reordering change the table without moving focus
  // there, so a screen reader is told what happened.
  const [announcement, setAnnouncement] = useState("");

  const addTypes = useCallback(
    (added: number[], source: CompareAddSource) => {
      const next = normalizeTypeIds([...typeIds, ...added], maxItems);
      if (next.length === typeIds.length) return;
      setRawTypeIds(next);
      const newlyAdded = next.slice(typeIds.length);
      setAnnouncement(
        `Added ${newlyAdded.map(nameOf).join(", ")}. ${itemCount(next.length)}.`,
      );
      onItemsAdded?.({ typeIds: next, added: newlyAdded, source });
    },
    [typeIds, maxItems, setRawTypeIds, nameOf, onItemsAdded],
  );

  const removeType = useCallback(
    (typeId: number) => {
      const next = typeIds.filter((id) => id !== typeId);
      setRawTypeIds(next);
      setAnnouncement(`Removed ${nameOf(typeId)}. ${itemCount(next.length)}.`);
    },
    [typeIds, setRawTypeIds, nameOf],
  );

  const moveType = useCallback(
    (typeId: number, index: number) => {
      const next = moveTypeId(typeIds, typeId, index);
      setRawTypeIds(next);
      const position = next.indexOf(typeId);
      setAnnouncement(
        position === 0
          ? `${nameOf(typeId)} is now the baseline.`
          : `${nameOf(typeId)} moved to column ${position + 1} of ${next.length}.`,
      );
    },
    [typeIds, setRawTypeIds, nameOf],
  );

  const clearTypes = useCallback(() => {
    setRawTypeIds([]);
    setAnnouncement("Comparison cleared.");
  }, [setRawTypeIds]);

  const isFull = typeIds.length >= maxItems;
  const lastTypeId = typeIds.at(-1);

  // The last item's group, offered in the empty add box: the most common
  // next pick is another item from it.
  const suggestions = useMemo(
    () =>
      catalog && lastTypeId !== undefined && !isFull
        ? suggestSameGroupTypes(catalog, lastTypeId, { exclude: typeIds })
        : [],
    [catalog, lastTypeId, typeIds, isFull],
  );
  const suggestionGroupId =
    lastTypeId === undefined
      ? undefined
      : catalog?.typesById.get(lastTypeId)?.groupId;
  const suggestionGroup =
    suggestionGroupId === undefined
      ? undefined
      : catalog?.groups[suggestionGroupId]?.name;

  // Items are added from the table's own trailing column, next to the ones
  // already there.
  const addColumn = useMemo(
    () =>
      editable ? (
        <CompareItemPicker
          catalog={catalog}
          isLoading={isCatalogLoading}
          selectedTypeIds={typeIds}
          onAdd={(typeId, source) => addTypes([typeId], source)}
          disabled={isFull}
          placeholder={isFull ? `${maxItems} items maximum` : "Add item…"}
          size="xs"
          suggestions={suggestions}
          suggestionsLabel={
            suggestionGroup ? `More from ${suggestionGroup}` : undefined
          }
        />
      ) : undefined,
    [
      editable,
      catalog,
      isCatalogLoading,
      typeIds,
      addTypes,
      isFull,
      maxItems,
      suggestions,
      suggestionGroup,
    ],
  );

  const catalogError = isCatalogError && (
    <Alert color="red" variant="light" title="Item data didn't load">
      <Group gap="sm">
        <Text size="sm">
          Search and attribute names are unavailable until it does.
        </Text>
        <Button
          size="compact-xs"
          variant="light"
          color="red"
          onClick={() => void refetchCatalog()}
        >
          Try again
        </Button>
      </Group>
    </Alert>
  );

  const liveRegion = (
    <VisuallyHidden role="status" aria-live="polite">
      {announcement}
    </VisuallyHidden>
  );

  if (typeIds.length === 0) {
    return (
      <Stack gap="lg">
        {liveRegion}
        {catalogError}
        {editable ? (
          <CompareItemPicker
            catalog={catalog}
            isLoading={isCatalogLoading}
            selectedTypeIds={typeIds}
            onAdd={(typeId) => addTypes([typeId], "search")}
            size="md"
          />
        ) : (
          <Text size="sm" c="dimmed" ta="center">
            Nothing to compare.
          </Text>
        )}
        {emptyState}
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      {liveRegion}
      {catalogError}
      {withToolbar && (
        <CompareToolbar
          itemCount={typeIds.length}
          onlyDifferences={onlyDifferences}
          onOnlyDifferencesChange={setOnlyDifferences}
          showHidden={showHidden}
          onShowHiddenChange={setShowHidden}
          filter={filter}
          onFilterChange={setFilter}
          comparison={catalog ? comparison : undefined}
          onClear={editable ? clearTypes : undefined}
        />
      )}
      {catalog || isCatalogError ? (
        <CompareTable
          typeIds={typeIds}
          catalog={catalog}
          comparison={comparison}
          names={names}
          groupIds={groupIds}
          onRemove={editable ? removeType : undefined}
          onMove={editable ? moveType : undefined}
          addColumn={addColumn}
          maxHeight={maxHeight}
        />
      ) : (
        <Skeleton height={480} radius="md" />
      )}
      {editable && typeIds.length === 1 && (
        <Text size="sm" c="dimmed" ta="center">
          Add another item to see which comes out ahead.
        </Text>
      )}
      {comparison.shownRows === 0 && catalog && (
        <Text size="sm" c="dimmed" ta="center">
          {filter
            ? `No attribute matches “${filter}”.`
            : "These items are identical in every shown attribute."}
        </Text>
      )}
    </Stack>
  );
}

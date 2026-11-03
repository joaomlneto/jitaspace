"use client";

import { useEffect, useState } from "react";
import {
  Button,
  CloseButton,
  Group,
  NumberInput,
  Paper,
  Pill,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconFilterOff, IconPackage, IconSearch } from "@tabler/icons-react";

import { postUniverseIds } from "@jitaspace/esi-client";
import { TypeAvatar, TypeName } from "@jitaspace/eve-components";

import type { ContractView } from "./ContractList";
import type { ContractRegionFacet } from "./data";
import type { ContractFilterUpdate } from "./useContractFilters";
import type { ContractFilters } from "~/components/Contracts/filters";
import { CONTRACT_KIND_LABEL } from "~/components/Contracts/contract";
import {
  CONTRACT_SEARCH_MAX_LENGTH,
  CONTRACT_SORT_LABELS,
  CONTRACT_SORTS,
  CONTRACT_TYPE_FILTERS,
} from "~/components/Contracts/filters";
import { Segmented } from "~/components/Wars/WarRoom/parts";
import { CONTRACT_VIEW_OPTIONS } from "./ContractList";

const TYPE_OPTIONS = CONTRACT_TYPE_FILTERS.map((value) => ({
  value,
  label: value === "all" ? "All" : CONTRACT_KIND_LABEL[value],
}));

const SORT_OPTIONS = CONTRACT_SORTS.map((value) => ({
  value,
  label: CONTRACT_SORT_LABELS[value],
}));

/** A text field that commits to the URL once typing pauses. */
function useDebouncedCommit<T>(
  committed: T,
  commit: (value: T) => void,
  delay = 400,
) {
  const [draft, setDraft] = useState(committed);
  const [debounced] = useDebouncedValue(draft, delay);

  // Follow the URL when it changes underneath (back button, "clear filters").
  const [lastCommitted, setLastCommitted] = useState(committed);
  if (!Object.is(committed, lastCommitted)) {
    setLastCommitted(committed);
    setDraft(committed);
  }

  useEffect(() => {
    if (!Object.is(debounced, committed)) commit(debounced);
    // Only a settled draft commits; `committed` changing is handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [draft, setDraft] as const;
}

/**
 * Narrow the list to contracts with one item type. ESI resolves an exact name
 * to its type id without a login (`POST /universe/ids`), which is what the
 * public listing filters on.
 */
function ItemFilter({
  typeId,
  onChange,
}: Readonly<{
  typeId: number | null;
  onChange: (typeId: number | null) => void;
}>) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  if (typeId !== null) {
    return (
      <Pill.Group>
        <Pill
          size="lg"
          withRemoveButton
          onRemove={() => onChange(null)}
          removeButtonProps={{ "aria-label": "Clear item filter" }}
        >
          <Group gap={6} wrap="nowrap">
            <TypeAvatar typeId={typeId} size={20} radius="sm" />
            <TypeName typeId={typeId} span size="sm" />
          </Group>
        </Pill>
      </Pill.Group>
    );
  }

  const resolve = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setResolving(true);
    setError(null);
    try {
      const response = await postUniverseIds([trimmed]);
      const match = response.data.inventory_types?.[0];
      if (match?.id !== undefined) {
        onChange(match.id);
        setName("");
      } else {
        setError("No item has exactly that name");
      }
    } catch {
      setError("Could not look the item up");
    } finally {
      setResolving(false);
    }
  };

  return (
    <TextInput
      style={{ flex: 1, minWidth: 200 }}
      aria-label="Filter by item"
      placeholder="Item name, e.g. Raven — press Enter"
      leftSection={<IconPackage size={16} />}
      value={name}
      error={error}
      disabled={resolving}
      onChange={(event) => {
        setName(event.currentTarget.value);
        setError(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") void resolve();
      }}
    />
  );
}

export function FiltersBar({
  filters,
  regions,
  update,
  reset,
  view,
  onViewChange,
}: Readonly<{
  filters: ContractFilters;
  regions: ContractRegionFacet[];
  update: (changes: ContractFilterUpdate) => void;
  reset: () => void;
  view: ContractView;
  onViewChange: (view: ContractView) => void;
}>) {
  const [query, setQuery] = useDebouncedCommit(filters.q, (q) => update({ q }));
  const [minPrice, setMinPrice] = useDebouncedCommit(
    filters.minPrice,
    (value) => update({ minPrice: value }),
  );
  const [maxPrice, setMaxPrice] = useDebouncedCommit(
    filters.maxPrice,
    (value) => update({ maxPrice: value }),
  );

  const isFiltered =
    filters.type !== "all" ||
    filters.regionId !== null ||
    filters.typeId !== null ||
    filters.q !== "" ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.sort !== "newest";

  const priceLabel = filters.type === "courier" ? "reward" : "price";
  const numberValue = (value: string | number) =>
    typeof value === "number" ? value : null;

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group gap="sm" justify="space-between" wrap="wrap">
          <Segmented
            label="Contract type"
            value={filters.type}
            onChange={(type) => update({ type })}
            data={TYPE_OPTIONS}
          />
          <Group gap="xs">
            <Segmented
              label="View"
              value={view}
              onChange={onViewChange}
              data={CONTRACT_VIEW_OPTIONS}
            />
            <Select
              size="xs"
              w={180}
              aria-label="Sort contracts"
              value={filters.sort}
              onChange={(value) => {
                const sort = CONTRACT_SORTS.find((option) => option === value);
                if (sort) update({ sort });
              }}
              data={SORT_OPTIONS}
              allowDeselect={false}
              checkIconPosition="right"
            />
            {isFiltered && (
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconFilterOff size={14} />}
                onClick={reset}
              >
                Clear filters
              </Button>
            )}
          </Group>
        </Group>
        <Group gap="sm" wrap="wrap" align="flex-start">
          <TextInput
            style={{ flex: 2, minWidth: 220 }}
            aria-label="Search contract titles"
            placeholder="Search titles"
            leftSection={<IconSearch size={16} />}
            maxLength={CONTRACT_SEARCH_MAX_LENGTH}
            rightSectionPointerEvents="all"
            rightSection={
              query !== "" && (
                <CloseButton
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                />
              )
            }
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <ItemFilter
            typeId={filters.typeId}
            onChange={(item) => update({ item })}
          />
          <Select
            style={{ flex: 1, minWidth: 200 }}
            aria-label="Region"
            placeholder="All regions"
            searchable
            clearable
            value={filters.regionId === null ? null : `${filters.regionId}`}
            onChange={(value) =>
              update({ region: value === null ? null : Number(value) })
            }
            data={regions.map((region) => ({
              value: `${region.regionId}`,
              label: `${region.name} (${region.count.toLocaleString()})`,
            }))}
            nothingFoundMessage="No region has open contracts"
          />
        </Group>
        <Group gap="sm" wrap="wrap" align="center">
          <Text size="sm" c="dimmed">
            ISK {priceLabel}
          </Text>
          <NumberInput
            w={170}
            size="xs"
            aria-label={`Minimum ${priceLabel}`}
            placeholder="Min"
            min={0}
            thousandSeparator=","
            hideControls
            value={minPrice ?? ""}
            onChange={(value) => setMinPrice(numberValue(value))}
          />
          <Text size="sm" c="dimmed">
            to
          </Text>
          <NumberInput
            w={170}
            size="xs"
            aria-label={`Maximum ${priceLabel}`}
            placeholder="Max"
            min={0}
            thousandSeparator=","
            hideControls
            value={maxPrice ?? ""}
            onChange={(value) => setMaxPrice(numberValue(value))}
          />
        </Group>
      </Stack>
    </Paper>
  );
}

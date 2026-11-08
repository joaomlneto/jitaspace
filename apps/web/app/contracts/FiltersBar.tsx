"use client";

import { useEffect, useState } from "react";
import {
  Button,
  CloseButton,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconFilterOff } from "@tabler/icons-react";

import { SystemSearchIcon } from "@jitaspace/eve-icons";

import type { ContractView } from "./ContractList";
import type { ContractFilterUpdate } from "./useContractFilters";
import type { ContractRegionFacet } from "~/components/Contracts/clientFilter";
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

const trim = (value: string) => value.trim();

const SORT_OPTIONS = CONTRACT_SORTS.map((value) => ({
  value,
  label: CONTRACT_SORT_LABELS[value],
}));

/**
 * A field that commits to the URL once typing pauses.
 *
 * `normalize` is what the URL holds for a draft (a search trims). The field
 * follows the URL only when the two really differ — the back button, "Clear
 * filters" — and not when the URL is just this draft normalized: following
 * then would strip the space a user just typed between two words.
 */
function useDebouncedCommit<T>(
  committed: T,
  commit: (value: T) => void,
  normalize: (value: T) => T = (value) => value,
  delay = 400,
) {
  const [draft, setDraft] = useState(committed);
  const [debounced] = useDebouncedValue(draft, delay);

  const [lastCommitted, setLastCommitted] = useState(committed);
  if (!Object.is(committed, lastCommitted)) {
    setLastCommitted(committed);
    if (!Object.is(committed, normalize(draft))) setDraft(committed);
  }

  useEffect(() => {
    const value = normalize(debounced);
    if (!Object.is(value, committed)) commit(value);
    // Only a settled draft commits; `committed` changing is handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [draft, setDraft] as const;
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
  const [query, setQuery] = useDebouncedCommit(
    filters.q,
    (q) => update({ q }),
    trim,
  );
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
            aria-label="Search contracts"
            placeholder="Search titles and items"
            leftSection={
              <SystemSearchIcon size={16} color="currentColor" alt="" />
            }
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
            // Whole ISK, never negative: a "1." or "-" mid-typing is not a
            // number, and would blank the field or set a filter not applied.
            allowDecimal={false}
            allowNegative={false}
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
            allowDecimal={false}
            allowNegative={false}
            value={maxPrice ?? ""}
            onChange={(value) => setMaxPrice(numberValue(value))}
          />
        </Group>
      </Stack>
    </Paper>
  );
}

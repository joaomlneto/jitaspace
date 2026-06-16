"use client";

import React, { memo, useMemo, useState } from "react";
import { Group, Loader, MultiSelect, Pill, rem } from "@mantine/core";
import { useDebouncedValue, useUncontrolled } from "@mantine/hooks";

import type { EsiSearchCategory } from "@jitaspace/hooks";
import { useEsiSearch } from "@jitaspace/hooks";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";
import { EsiSearchMultiSelectItem } from "./EsiSearchMultiSelectItem";

export type EsiSearchMultiSelectProps = {
  categories: EsiSearchCategory[];
  debounceTime?: number;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

const MIN_SEARCH_LENGTH = 3;
const MAX_RESULTS_PER_CATEGORY = 100;

export const EsiSearchMultiSelect = memo(
  ({
    categories,
    debounceTime,
    value,
    defaultValue,
    onChange,
    placeholder,
    disabled,
    readOnly,
    ...inputProps
  }: EsiSearchMultiSelectProps) => {
    const [selectedValues, setSelectedValues] = useUncontrolled<string[]>({
      value,
      defaultValue,
      finalValue: [],
      onChange,
    });

    const [searchValue, setSearchValue] = useState("");
    const [debouncedSearchValue] = useDebouncedValue(
      searchValue,
      debounceTime ?? 1000,
    );

    const { data: searchResult, isLoading } = useEsiSearch(
      debouncedSearchValue,
      { categories },
    );

    const isLoadingData = isLoading || searchValue !== debouncedSearchValue;

    // Flatten the per-category ESI results into Combobox options, keeping a
    // value -> category lookup so the dropdown can show the entity's category.
    const { data, categoryByValue } = useMemo(() => {
      const categoryByValue = new Map<string, EsiSearchCategory>();
      const data = Object.entries(searchResult?.data ?? {}).flatMap(
        ([category, ids]) =>
          ids.slice(0, MAX_RESULTS_PER_CATEGORY).map((id) => {
            const value = `${id}`;
            categoryByValue.set(value, category as EsiSearchCategory);
            return { value, label: `${category} ${id}` };
          }),
      );
      return { data, categoryByValue };
    }, [searchResult]);

    let nothingFoundMessage: string;
    if (searchValue.length < MIN_SEARCH_LENGTH) {
      nothingFoundMessage = `Type at least ${MIN_SEARCH_LENGTH} characters to search for results`;
    } else if (isLoadingData) {
      nothingFoundMessage = "Searching…";
    } else {
      nothingFoundMessage = "No results found";
    }

    return (
      <MultiSelect
        value={selectedValues}
        onChange={setSelectedValues}
        searchable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        data={data}
        // Results are already filtered server-side; keep every option returned
        // instead of re-filtering the labels (which encode the raw entity id).
        filter={({ options }) => options}
        hidePickedOptions
        maxDropdownHeight={250}
        nothingFoundMessage={nothingFoundMessage}
        rightSection={isLoadingData ? <Loader size="sm" /> : undefined}
        // Match the previous behaviour of hiding the placeholder once a value
        // is selected (the high-level MultiSelect keeps it by default).
        placeholder={selectedValues.length > 0 ? undefined : placeholder}
        disabled={disabled}
        readOnly={readOnly}
        renderOption={({ option }) => (
          <EsiSearchMultiSelectItem
            option={{
              value: option.value,
              label: option.label,
              category: categoryByValue.get(option.value),
            }}
          />
        )}
        renderPill={({ value: pillValue, onRemove }) => {
          const interactive = !disabled && !readOnly;
          return (
            <Pill
              p={0}
              withRemoveButton={interactive}
              onRemove={onRemove}
              disabled={!interactive}
            >
              <Group wrap="nowrap" gap={rem(4)} align="center">
                <EveEntityAvatar entityId={pillValue} size={22} radius="xl" />
                <EveEntityName entityId={pillValue} size="sm" />
              </Group>
            </Pill>
          );
        }}
        {...inputProps}
      />
    );
  },
);
EsiSearchMultiSelect.displayName = "EsiSearchMultiSelect";

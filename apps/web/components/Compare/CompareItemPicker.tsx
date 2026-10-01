"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Combobox,
  Group,
  Loader,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { TypeAvatar } from "@jitaspace/eve-components";

import type { CatalogType, IndexedCompareCatalog } from "./catalog";
import { MIN_SEARCH_LENGTH, searchCatalogTypes } from "./search";

export interface CompareItemPickerProps {
  catalog?: IndexedCompareCatalog;
  isLoading: boolean;
  selectedTypeIds: number[];
  /** `source` says whether the pick came from a search or a suggestion. */
  onAdd: (typeId: number, source: "search" | "suggestion") => void;
  disabled?: boolean;
  placeholder?: string;
  size?: "xs" | "sm" | "md";
  /**
   * Items offered while the box is empty — the rest of the last item's group,
   * the most common next pick — under `suggestionsLabel`.
   */
  suggestions?: CatalogType[];
  suggestionsLabel?: string;
}

const MAX_RESULTS = 40;

/**
 * Search-as-you-type over the catalog. Picking a result adds it and clears the
 * box, ready for the next one; Enter adds the top result.
 */
export const CompareItemPicker = memo(
  ({
    catalog,
    isLoading,
    selectedTypeIds,
    onAdd,
    disabled,
    placeholder = "Search ships, modules, drones, implants…",
    size = "sm",
    suggestions = [],
    suggestionsLabel,
  }: CompareItemPickerProps) => {
    const combobox = useCombobox({
      onDropdownClose: () => combobox.resetSelectedOption(),
    });
    const [search, setSearch] = useState("");

    const query = search.trim();
    const showSuggestions = query.length === 0 && suggestions.length > 0;
    const results = useMemo(
      () =>
        catalog
          ? searchCatalogTypes(catalog, search, {
              limit: MAX_RESULTS,
              exclude: selectedTypeIds,
            })
          : [],
      [catalog, search, selectedTypeIds],
    );
    const options = showSuggestions ? suggestions : results;

    // Keep the top result highlighted so Enter adds it.
    useEffect(() => {
      if (results.length > 0) combobox.selectFirstOption();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- the store is stable
    }, [results]);

    let emptyMessage = "No matching items";
    if (query.length < MIN_SEARCH_LENGTH) {
      emptyMessage = "Type at least two letters";
    } else if (!catalog && isLoading) {
      emptyMessage = "Loading items…";
    } else if (!catalog) {
      emptyMessage = "Item search is unavailable right now";
    }

    return (
      <Combobox
        store={combobox}
        width={size === "xs" ? 320 : undefined}
        position="bottom-start"
        onOptionSubmit={(value) => {
          onAdd(Number(value), showSuggestions ? "suggestion" : "search");
          setSearch("");
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <TextInput
            aria-label="Add an item to compare"
            placeholder={placeholder}
            size={size}
            leftSection={<IconSearch size={16} />}
            rightSection={
              isLoading && query.length > 0 ? <Loader size="xs" /> : null
            }
            value={search}
            disabled={disabled}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              combobox.openDropdown();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
          />
        </Combobox.Target>

        <Combobox.Dropdown hidden={query.length === 0 && !showSuggestions}>
          <Combobox.Options mah={360} style={{ overflowY: "auto" }}>
            {showSuggestions && suggestionsLabel && (
              <Text size="xs" c="dimmed" px="xs" pt={4} pb={2}>
                {suggestionsLabel}
              </Text>
            )}
            {options.length > 0 ? (
              options.map((type) => {
                const group = catalog?.groups[type.groupId];
                const metaGroupName =
                  type.metaGroupId === undefined
                    ? undefined
                    : catalog?.metaGroups[type.metaGroupId];
                return (
                  <Combobox.Option value={`${type.typeId}`} key={type.typeId}>
                    <Group gap="sm" wrap="nowrap">
                      <TypeAvatar typeId={type.typeId} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" truncate>
                          {type.name}
                        </Text>
                        {group && (
                          <Text size="xs" c="dimmed" truncate>
                            {group.name}
                          </Text>
                        )}
                      </div>
                      {metaGroupName && (
                        <Badge size="xs" variant="light" color="gray">
                          {metaGroupName}
                        </Badge>
                      )}
                    </Group>
                  </Combobox.Option>
                );
              })
            ) : (
              <Combobox.Empty>{emptyMessage}</Combobox.Empty>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    );
  },
);
CompareItemPicker.displayName = "CompareItemPicker";

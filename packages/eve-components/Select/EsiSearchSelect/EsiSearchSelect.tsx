"use client";

import type { SelectProps } from "@mantine/core";
import React, { memo, useMemo } from "react";
import { Badge, Group, Loader, rem, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import type { EsiSearchCategory as GetCharactersCharacterIdSearchQueryParamsCategoriesEnum } from "@jitaspace/hooks";
import { useEsiNameLookup, useEsiSearch } from "@jitaspace/hooks";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";

export type EsiSearchSelectProps = Omit<
  SelectProps,
  "data" | "searchable" | "searchValue" | "onSearchChange"
> & {
  categories: GetCharactersCharacterIdSearchQueryParamsCategoriesEnum[];
  debounceTime?: number;
};

export const EsiSearchSelect = memo(
  ({ categories, debounceTime, ...otherProps }: EsiSearchSelectProps) => {
    const [value, setValue] = React.useState<string | null>(null);
    const [searchValue, setSearchValue] = React.useState<string>("");
    const [debouncedSearchValue] = useDebouncedValue(
      searchValue,
      debounceTime ?? 1000,
    );

    const { data: searchResult, isLoading } = useEsiSearch(
      debouncedSearchValue,
      {
        categories,
      },
    );

    const slicedEntries = useMemo(
      () =>
        Object.entries(searchResult?.data ?? {}).flatMap(
          ([categoryName, ids]) =>
            ids.slice(0, 100).map((id) => ({ id, categoryName })),
        ),
      [searchResult?.data],
    );

    const entityEntries = useMemo(
      () => slicedEntries.map(({ id }) => ({ id })),
      [slicedEntries],
    );
    const names = useEsiNameLookup(entityEntries);

    const data = useMemo(
      () =>
        slicedEntries.map(({ id, categoryName }) => ({
          label: names[id.toString()]?.value?.name ?? "Unknown",
          value: `${id}`,
          category: categoryName,
        })),
      [slicedEntries, names],
    );

    const isLoadingData: boolean =
      isLoading || searchValue !== debouncedSearchValue;

    let nothingFoundMessage: string;
    if (searchValue.length < 3) {
      nothingFoundMessage = "Type at least 3 characters to search for results";
    } else if (isLoadingData) {
      nothingFoundMessage = "Searching…";
    } else {
      nothingFoundMessage = "No results found";
    }

    return (
      <Select
        filter={({ options }) => options}
        data={data}
        value={otherProps.value ?? value}
        onChange={(value: string | null, options) => {
          setValue(value);
          otherProps.onChange?.(value, options);
        }}
        searchable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        renderOption={({ option }) => {
          const category = (
            option as typeof option & {
              category?: GetCharactersCharacterIdSearchQueryParamsCategoriesEnum;
            }
          ).category;
          return (
            <Group wrap="nowrap" justify="space-between">
              <Group wrap="nowrap" gap="xs">
                <EveEntityAvatar
                  entityId={option.value}
                  category={category}
                  size={24}
                />
                <EveEntityName
                  entityId={option.value}
                  category={category}
                  style={{ lineHeight: 1, fontSize: rem(12) }}
                />
              </Group>
              {category && (
                <Badge size="xs" variant="subtle">
                  {category}
                </Badge>
              )}
            </Group>
          );
        }}
        rightSection={isLoadingData && <Loader size="sm" />}
        nothingFoundMessage={nothingFoundMessage}
        {...otherProps}
      />
    );
  },
);
EsiSearchSelect.displayName = "EsiSearchSelect";

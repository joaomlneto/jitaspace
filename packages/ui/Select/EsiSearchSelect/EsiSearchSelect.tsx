import React, { memo } from "react";
import { Loader, Select, type SelectProps } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import { type GetCharactersCharacterIdSearchQueryParamsCategories } from "@jitaspace/esi-client";
import { useEsiNamesCache, useEsiSearch } from "@jitaspace/hooks";





export type EsiSearchSelectProps = Omit<
  SelectProps,
  "data" | "searchable" | "searchValue" | "onSearchChange"
> & {
  categories: GetCharactersCharacterIdSearchQueryParamsCategories[];
  debounceTime?: number;
};

export const EsiSearchSelect = memo(
  ({ categories, debounceTime, ...otherProps }: EsiSearchSelectProps) => {
    const [value, setValue] = React.useState<string | null>(null);
    const [searchValue, onSearchChange] = React.useState<string>("");
    const [debouncedSearchValue] = useDebouncedValue(
      searchValue,
      debounceTime ?? 1000,
    );

    const names = useEsiNamesCache();

    const { data: searchResult, isLoading } = useEsiSearch(
      debouncedSearchValue,
      {
        categories,
      },
    );

    const data = [
      ...Object.entries(searchResult?.data ?? []).flatMap(
        ([categoryName, categoryIds]) =>
          categoryIds.slice(0, 100).map((id) => ({
            label: names[id]?.value?.name ?? "Unknown",
            value: `${id}`,
            category: categoryName,
          })),
      ),
    ];

    const isLoadingData: boolean =
      isLoading || searchValue !== debouncedSearchValue;

    const onChange = (value: string | null) => {
      setValue(value);
      otherProps.onChange?.(value);
    };

    return (
      <Select
        //filter={() => true}
        data={data}
        value={otherProps.value ?? value}
        onChange={onChange}
        searchable
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        //itemComponent={EsiSearchSelectItem}
        rightSection={isLoadingData && <Loader size="sm" />}
        nothingFoundMessage={
          (searchValue ?? "").length < 3
            ? "Type at least 3 characters to search for results"
            : isLoadingData
              ? "Searching…"
              : "No results found"
        }
        {...otherProps}
      />
    );
  },
);
EsiSearchSelect.displayName = "EsiSearchSelect";

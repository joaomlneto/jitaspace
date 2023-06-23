import React, { memo } from "react";
import { Loader, Select, type SelectProps } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import {
  useEsiClientContext,
  useEsiNamesCache,
  useGetCharactersCharacterIdSearch,
  type GetCharactersCharacterIdSearchCategoriesItem,
} from "@jitaspace/esi-client";

import { EsiSearchSelectItem } from "./EsiSearchSelectItem";

export type EsiSearchSelectProps = Omit<
  SelectProps,
  "data" | "searchable" | "searchValue" | "onSearchChange"
> & {
  categories: GetCharactersCharacterIdSearchCategoriesItem[];
  debounceTime?: number;
};

export const EsiSearchSelect = memo(
  ({ categories, debounceTime, ...otherProps }: EsiSearchSelectProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();
    const [value, setValue] = React.useState<string | null>(null);
    const [searchValue, onSearchChange] = React.useState<string>("");
    const [debouncedSearchValue] = useDebouncedValue(
      searchValue,
      debounceTime ?? 1000,
    );

    const names = useEsiNamesCache();

    const {
      data: searchResult,
      isLoading,
      isValidating,
    } = useGetCharactersCharacterIdSearch(
      characterId ?? 1,
      {
        // @ts-expect-error - This is a bug in the generated code
        categories: categories.join(","),
        search: debouncedSearchValue,
      },
      {
        swr: {
          enabled: isTokenValid && searchValue?.length >= 3,
        },
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
      isLoading || isValidating || searchValue !== debouncedSearchValue;

    const onChange = (value: string) => {
      setValue(value);
      otherProps.onChange?.(value);
    };

    return (
      <Select
        filter={() => true}
        data={data}
        value={otherProps.value ?? value}
        onChange={onChange}
        searchable
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        itemComponent={EsiSearchSelectItem}
        rightSection={isLoadingData && <Loader size="sm" />}
        nothingFound={
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

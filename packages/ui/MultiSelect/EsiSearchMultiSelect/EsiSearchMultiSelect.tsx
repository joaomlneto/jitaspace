import React, { memo } from "react";
import { Loader, MultiSelect, type MultiSelectProps } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdSearch,
  type GetCharactersCharacterIdSearchCategoriesItem,
} from "@jitaspace/esi-client";

import { EsiSearchMultiSelectItem } from "./EsiSearchMultiSelectItem";
import { EsiSearchMultiSelectValue } from "./EsiSearchMultiSelectValue";

export type EsiSearchMultiSelectProps = Omit<
  MultiSelectProps,
  "data" | "searchable" | "searchValue" | "onSearchChange"
> & {
  categories: GetCharactersCharacterIdSearchCategoriesItem[];
  debounceTime?: number;
};

export const EsiSearchMultiSelect = memo(
  ({ debounceTime, ...otherProps }: EsiSearchMultiSelectProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();
    const [value, setValue] = React.useState<string[]>([]);
    const [searchValue, onSearchChange] = React.useState<string>("");
    const [debouncedSearchValue] = useDebouncedValue(
      searchValue,
      debounceTime ?? 1000,
    );

    const {
      data: searchResult,
      isLoading,
      isValidating,
    } = useGetCharactersCharacterIdSearch(
      characterId ?? 1,
      {
        // @ts-expect-error - This is a bug in the generated code
        categories: ["alliance", "corporation", "character"].join(","),
        search: debouncedSearchValue,
      },
      {
        swr: {
          enabled: isTokenValid && searchValue.length >= 3,
        },
      },
    );

    const data = [
      ...Object.entries(searchResult?.data ?? []).flatMap(
        ([categoryName, categoryIds]) =>
          categoryIds.slice(0, 100).map((id) => ({
            label: `${categoryName} ${id}`,
            value: `${id}`,
            category: categoryName,
          })),
      ),
      // we need to include the already-selected items in the list, otherwise
      // the MultiSelect will not show them at all in the value field!
      ...(otherProps.value ?? value).map((id) => ({
        label: id,
        value: id,
        category: undefined,
      })),
    ];

    const isLoadingData: boolean =
      isLoading || isValidating || searchValue !== debouncedSearchValue;

    const onChange = (value: string[]) => {
      setValue(value);
      otherProps.onChange?.(value);
    };

    return (
      <MultiSelect
        filter={(value: string, selected: boolean) => !selected}
        data={data}
        value={otherProps.value ?? value}
        onChange={onChange}
        searchable
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        itemComponent={EsiSearchMultiSelectItem}
        valueComponent={EsiSearchMultiSelectValue}
        clearSearchOnChange={false}
        rightSection={isLoadingData && <Loader size="sm" />}
        nothingFound={
          searchValue.length < 3
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
EsiSearchMultiSelect.displayName = "EsiSearchMultiSelect";

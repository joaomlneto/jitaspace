"use client";

import React, { memo, useState } from "react";
import {
  Combobox,
  Loader,
  Pill,
  PillsInput,
  ScrollArea,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import { type GetCharactersCharacterIdSearchQueryParamsCategoriesEnum } from "@jitaspace/esi-client";
import { useEsiSearch } from "@jitaspace/hooks";

import { EsiSearchMultiSelectItem } from "./EsiSearchMultiSelectItem";
import { EsiSearchMultiSelectValue } from "./EsiSearchMultiSelectValue";

export type EsiSearchMultiSelectProps = {
  categories: GetCharactersCharacterIdSearchQueryParamsCategoriesEnum[];
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

export const EsiSearchMultiSelect = memo(
  ({
    categories,
    debounceTime,
    value: controlledValue,
    defaultValue,
    onChange,
    placeholder,
    disabled,
    readOnly,
    ...inputProps
  }: EsiSearchMultiSelectProps) => {
    const [internalValue, setInternalValue] = useState<string[]>(
      defaultValue ?? [],
    );
    const value = controlledValue ?? internalValue;

    const [searchValue, setSearchValue] = useState("");
    const [debouncedSearchValue] = useDebouncedValue(
      searchValue,
      debounceTime ?? 1000,
    );

    const combobox = useCombobox({
      onDropdownClose: () => combobox.resetSelectedOption(),
      onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
    });

    const { data: searchResult, isLoading } = useEsiSearch(
      debouncedSearchValue,
      { categories },
    );

    const isLoadingData = isLoading || searchValue !== debouncedSearchValue;

    const selectedValues = new Set(value);

    const options = Object.entries(searchResult?.data ?? []).flatMap(
      ([categoryName, categoryIds]) =>
        categoryIds
          .filter((id) => !selectedValues.has(`${id}`))
          .slice(0, 100)
          .map((id) => ({
            label: `${categoryName} ${id}`,
            value: `${id}`,
            category:
              categoryName as GetCharactersCharacterIdSearchQueryParamsCategoriesEnum,
          })),
    );

    const handleValueSelect = (val: string) => {
      const next = [...value, val];
      setInternalValue(next);
      onChange?.(next);
      setSearchValue("");
    };

    const handleValueRemove = (val: string) => {
      const next = value.filter((v) => v !== val);
      setInternalValue(next);
      onChange?.(next);
    };

    const pills = value.map((id) => (
      <EsiSearchMultiSelectValue
        key={id}
        value={id}
        onRemove={() => handleValueRemove(id)}
        disabled={disabled || readOnly}
      />
    ));

    const emptyMessage =
      searchValue.length < 3
        ? "Type at least 3 characters to search for results"
        : isLoadingData
          ? "Searching…"
          : "No results found";

    return (
      <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
        <Combobox.DropdownTarget>
          <PillsInput
            onClick={() => !disabled && !readOnly && combobox.openDropdown()}
            rightSection={isLoadingData ? <Loader size="sm" /> : undefined}
            disabled={disabled}
            {...inputProps}
          >
            <Pill.Group>
              {pills}
              <Combobox.EventsTarget>
                <PillsInput.Field
                  onFocus={() => combobox.openDropdown()}
                  onBlur={() => combobox.closeDropdown()}
                  value={searchValue}
                  placeholder={value.length === 0 ? placeholder : undefined}
                  disabled={disabled}
                  readOnly={readOnly}
                  onChange={(e) => {
                    setSearchValue(e.currentTarget.value);
                    combobox.updateSelectedOptionIndex();
                  }}
                  onKeyDown={(e) => {
                    const lastValue = value?.[value.length - 1];
                    if (lastValue && e.key === "Backspace" && searchValue.length === 0) {
                      e.preventDefault();
                      handleValueRemove(lastValue);
                    }
                  }}
                />
              </Combobox.EventsTarget>
            </Pill.Group>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options>
            <ScrollArea.Autosize type="scroll" mah={250}>
              {options.length > 0 ? (
                options.map((option) => (
                  <Combobox.Option key={option.value} value={option.value}>
                    <EsiSearchMultiSelectItem option={option} />
                  </Combobox.Option>
                ))
              ) : (
                <Combobox.Empty>{emptyMessage}</Combobox.Empty>
              )}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    );
  },
);
EsiSearchMultiSelect.displayName = "EsiSearchMultiSelect";

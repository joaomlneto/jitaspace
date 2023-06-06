import React, { forwardRef } from "react";
import {
  Badge,
  Box,
  CloseButton,
  Group,
  Loader,
  MultiSelect,
  rem,
  type MultiSelectProps,
  type MultiSelectValueProps,
  type SelectItemProps,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useSession } from "next-auth/react";

import {
  useGetCharactersCharacterIdSearch,
  type GetCharactersCharacterIdSearchCategoriesItem,
} from "@jitaspace/esi-client";
import {
  AllianceAvatar,
  CharacterAvatar,
  CorporationAvatar,
  TypeAvatar,
  UnknownCategoryEveEntityAvatar,
} from "@jitaspace/ui";

import {
  AllianceNameText,
  CharacterNameText,
  CorporationNameText,
  EveEntityNameText,
} from "~/components/Text";

export type EsiSearchMultiSelectProps = Omit<
  MultiSelectProps,
  "data" | "searchable" | "searchValue" | "onSearchChange"
> & {
  categories: GetCharactersCharacterIdSearchCategoriesItem[];
  debounceTime?: number;
};

export type EsiSearchMultiSelectItemProps = SelectItemProps & {
  category: GetCharactersCharacterIdSearchCategoriesItem;
};

export function EsiSearchMultiselectValue({
  value,
  onRemove,
  ...others
}: MultiSelectValueProps & { value: string; category: string }) {
  return (
    <div {...others}>
      <Box
        sx={(theme) => ({
          display: "flex",
          cursor: "default",
          alignItems: "center",
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
          border: `${rem(1)} solid ${
            theme.colorScheme === "dark"
              ? theme.colors.dark[7]
              : theme.colors.gray[4]
          }`,
          paddingLeft: theme.spacing.xs,
          borderRadius: theme.radius.sm,
        })}
      >
        <UnknownCategoryEveEntityAvatar
          id={value}
          size={16}
          mr={10}
          radius="xl"
        />
        <EveEntityNameText
          entityId={value}
          sx={{ lineHeight: 1, fontSize: rem(12) }}
        />
        <CloseButton
          onMouseDown={onRemove}
          variant="transparent"
          size={22}
          iconSize={14}
          tabIndex={-1}
        />
      </Box>
    </div>
  );
}

export const EsiSearchMultiSelectItem = forwardRef<
  HTMLDivElement,
  EsiSearchMultiSelectItemProps
>(({ value, category, ...others }, ref) => {
  const AvatarComponent = () => {
    // TODO: should support other categories for better performance!
    switch (category) {
      case "alliance":
        return (
          <AllianceAvatar allianceId={value} size={16} mr={10} radius="xl" />
        );
      case "corporation":
        return (
          <CorporationAvatar
            corporationId={value}
            size={16}
            mr={10}
            radius="xl"
          />
        );
      case "character":
        return (
          <CharacterAvatar characterId={value} size={16} mr={10} radius="xl" />
        );
      case "inventory_type":
        return <TypeAvatar typeId={value} size={16} mr={10} radius="xl" />;
      default:
        return (
          <UnknownCategoryEveEntityAvatar
            id={value}
            size={16}
            mr={10}
            radius="xl"
          />
        );
    }
  };
  const TextComponent = () => {
    // TODO: should support other categories for better performance!
    switch (category) {
      case "alliance":
        return (
          <AllianceNameText
            allianceId={value!}
            sx={{ lineHeight: 1, fontSize: rem(12) }}
          />
        );
      case "corporation":
        return (
          <CorporationNameText
            corporationId={value!}
            sx={{ lineHeight: 1, fontSize: rem(12) }}
          />
        );
      case "character":
        return (
          <CharacterNameText
            characterId={value!}
            sx={{ lineHeight: 1, fontSize: rem(12) }}
          />
        );
      default:
        return (
          <EveEntityNameText
            entityId={value}
            sx={{ lineHeight: 1, fontSize: rem(12) }}
          />
        );
    }
  };
  return (
    <Group noWrap position="apart" ref={ref} {...others}>
      <Group noWrap spacing="xs">
        <AvatarComponent />
        <TextComponent />
      </Group>
      <Badge size="xs" variant="subtle">
        {category}
      </Badge>
    </Group>
  );
});
EsiSearchMultiSelectItem.displayName = "EsiSearchMultiselectItem";

export function EsiSearchMultiSelect({
  debounceTime,
  ...otherProps
}: EsiSearchMultiSelectProps) {
  const { data: session } = useSession();
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
    session?.user.id ?? 1,
    {
      // @ts-expect-error - This is a bug in the generated code
      categories: ["alliance", "corporation", "character"].join(","),
      search: debouncedSearchValue,
    },
    {
      swr: {
        enabled: !!session?.user.id && searchValue.length >= 3,
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
    ...value.map((id) => ({
      label: id,
      value: id,
      category: undefined,
    })),
  ];

  const isLoadingData: boolean =
    isLoading || isValidating || searchValue !== debouncedSearchValue;

  return (
    <MultiSelect
      filter={(value: string, selected: boolean) => !selected}
      data={data}
      value={otherProps.value ?? value}
      onChange={(value: string[]) => {
        setValue(value);
        otherProps.onChange?.(value);
      }}
      searchable
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      itemComponent={EsiSearchMultiSelectItem}
      valueComponent={EsiSearchMultiselectValue}
      clearSearchOnChange={false}
      rightSection={isLoadingData && <Loader size="sm" />}
      nothingFound={
        searchValue.length >= 3
          ? isLoadingData
            ? "Searching…"
            : "No results found"
          : "Type at least 3 characters to search for results"
      }
      {...otherProps}
    />
  );
}

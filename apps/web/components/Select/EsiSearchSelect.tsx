import React, { forwardRef, useEffect } from "react";
import { Group, Select, type SelectProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import {
  postUniverseNames,
  useGetCharactersCharacterIdSearch,
  type PostUniverseNames200ItemCategory,
} from "@jitaspace/esi-client";
import { CharacterAvatar } from "@jitaspace/ui";

import { CharacterNameText } from "../Text";

interface ItemProps extends React.ComponentPropsWithoutRef<"div"> {
  characterId: number;
  label: string;
}

const EsiSearchSelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ characterId, ...others }: ItemProps, ref) => {
    return (
      <div ref={ref} {...others}>
        <Group noWrap>
          <CharacterAvatar characterId={characterId} radius="xl" />
          <div>
            <CharacterNameText characterId={characterId} size="sm" />
          </div>
        </Group>
      </div>
    );
  },
);

EsiSearchSelectItem.displayName = "EsiSearchSelectItem";

type EsiSearchSelectProps = Omit<SelectProps, "data"> & {
  debouncedSearchValue?: string;
  namesCache: Record<
    number,
    { name: string; category: PostUniverseNames200ItemCategory }
  >;
  setNamesCache: (
    entry: Record<
      number,
      {
        name: string;
        category: PostUniverseNames200ItemCategory;
      }
    >,
  ) => void;
};

export default function EsiSearchSelect({
  namesCache,
  setNamesCache,
  ...otherProps
}: EsiSearchSelectProps) {
  const { data: session } = useSession();

  const esiSearchValue =
    otherProps.debouncedSearchValue ?? otherProps.searchValue ?? "";

  const userIsTyping = esiSearchValue !== otherProps.searchValue;

  const { data, isLoading, isValidating } = useGetCharactersCharacterIdSearch(
    session?.user.id ?? 1,
    {
      // @ts-expect-error - This is a bug in the generated code
      categories: ["alliance", "character"].join(","),
      search: esiSearchValue,
    },
    {
      swr: {
        enabled: !!session?.user.id && esiSearchValue.length >= 3,
      },
    },
  );

  useEffect(() => {
    if (data?.data.character) {
      const missingIds = data.data.character.filter((id) => !namesCache[id]);
      if (missingIds.length === 0) {
        return;
      }
      void postUniverseNames(missingIds).then((response) => {
        console.log(response);
        response.data.forEach((item) => {
          setNamesCache({
            [item.id]: {
              name: item.name,
              category: item.category,
            },
          });
        });
      });
    }
  }, [data?.data.character, namesCache, setNamesCache]);

  const characters =
    data?.data.character
      ?.map((characterId) => ({
        characterId,
        value: characterId.toString(),
        label: namesCache[characterId]?.name ?? `Character ${characterId}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) ?? [];

  const selectProps = {
    label: "Character",
    placeholder: "Pick a character",
    itemComponent: EsiSearchSelectItem,
    searchable: true,
    allowDeselect: true,
    clearable: otherProps.clearable ?? true,
    maxDropdownHeight: 400,
    nothingFound:
      otherProps.searchValue && otherProps.searchValue.length >= 3
        ? userIsTyping ||
          isLoading ||
          isValidating ||
          characters.some(({ characterId }) => !namesCache[characterId])
          ? "Searching…"
          : "Nobody here"
        : "Type at least 3 characters",
    size: otherProps.size,
    ...otherProps,
  };

  return (
    <Select
      filter={() => true}
      icon={
        otherProps.value ? (
          <CharacterAvatar
            characterId={otherProps.value}
            size={24}
            radius="xl"
          />
        ) : undefined
      }
      data={characters}
      onChange={(value) => {
        //otherProps.onSearchChange && otherProps.onSearchChange(value ?? "");
        otherProps.onChange && otherProps.onChange(value);
      }}
      onSearchChange={(value) => {
        if (value && otherProps.value && otherProps.value !== value) {
          otherProps.onChange && otherProps.onChange("");
        }
      }}
      {...selectProps}
    />
  );
}

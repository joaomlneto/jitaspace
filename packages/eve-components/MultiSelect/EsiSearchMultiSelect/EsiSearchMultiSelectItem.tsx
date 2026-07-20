"use client";

import type { ComboboxLikeRenderOptionInput } from "@mantine/core";
import { Avatar, Badge, Group, rem, Text } from "@mantine/core";

import type { EsiSearchCategory as GetCharactersCharacterIdSearchQueryParamsCategoriesEnum } from "@jitaspace/hooks";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";

export interface EsiSearchMultiSelectItemOption {
  value: string;
  label: string;
  category?: GetCharactersCharacterIdSearchQueryParamsCategoriesEnum;
}

export type EsiSearchMultiSelectItemProps =
  ComboboxLikeRenderOptionInput<EsiSearchMultiSelectItemOption>;

export function EsiSearchMultiSelectItem({
  option,
}: Readonly<EsiSearchMultiSelectItemProps>) {
  const { value, category } = option;
  return (
    <Group wrap="nowrap" justify="space-between">
      <Group wrap="nowrap" gap="xs">
        {value ? (
          <EveEntityAvatar entityId={value} size={16} mr={10} radius="xl" />
        ) : (
          <Avatar size={16} mr={10} radius="xl" />
        )}
        {value ? (
          <EveEntityName
            entityId={value}
            category={category}
            style={{ lineHeight: 1, fontSize: rem(12) }}
          />
        ) : (
          <Text style={{ lineHeight: 1, fontSize: rem(12) }}>Unknown</Text>
        )}
      </Group>
      {category && (
        <Badge size="xs" variant="subtle">
          {category}
        </Badge>
      )}
    </Group>
  );
}

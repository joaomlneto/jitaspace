import React, { forwardRef } from "react";
import {
  Avatar,
  Badge,
  Group,
  rem,
  Text,
  type SelectItemProps,
} from "@mantine/core";

import { type GetCharactersCharacterIdSearchQueryParamsCategories } from "@jitaspace/esi-client";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";


export type EsiSearchSelectItemProps = SelectItemProps & {
  category: GetCharactersCharacterIdSearchQueryParamsCategories;
};

export const EsiSearchSelectItem = forwardRef<
  HTMLDivElement,
  EsiSearchSelectItemProps
>(({ value, category, ...others }, ref) => {
  return (
    <Group wrap="nowrap" justify="space-between" ref={ref} {...others}>
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
      <Badge size="xs" variant="subtle">
        {category}
      </Badge>
    </Group>
  );
});
EsiSearchSelectItem.displayName = "EsiSearchSelectItem";

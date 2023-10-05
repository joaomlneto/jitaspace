import React, { forwardRef } from "react";
import {
  Avatar,
  Badge,
  Group,
  rem,
  Text,
  type SelectItemProps,
} from "@mantine/core";

import { type GetCharactersCharacterIdSearchCategoriesItem } from "@jitaspace/esi-client-kubb";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";

export type EsiSearchMultiSelectItemProps = SelectItemProps & {
  category: GetCharactersCharacterIdSearchCategoriesItem;
};

export const EsiSearchMultiSelectItem = forwardRef<
  HTMLDivElement,
  EsiSearchMultiSelectItemProps
>(({ value, category, ...others }, ref) => {
  return (
    <Group noWrap position="apart" ref={ref} {...others}>
      <Group noWrap spacing="xs">
        {value ? (
          <EveEntityAvatar entityId={value} size={16} mr={10} radius="xl" />
        ) : (
          <Avatar size={16} mr={10} radius="xl" />
        )}
        {value ? (
          <EveEntityName
            entityId={value}
            category={category}
            sx={{ lineHeight: 1, fontSize: rem(12) }}
          />
        ) : (
          <Text sx={{ lineHeight: 1, fontSize: rem(12) }}>Unknown</Text>
        )}
      </Group>
      <Badge size="xs" variant="subtle">
        {category}
      </Badge>
    </Group>
  );
});
EsiSearchMultiSelectItem.displayName = "EsiSearchMultiselectItem";

/*
              <EveEntityName
                entityId={value}
                category={category}
                sx={{ lineHeight: 1, fontSize: rem(12) }}
              />
*/

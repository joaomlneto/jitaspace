import React, { forwardRef } from "react";
import {
  Avatar,
  Badge,
  Group,
  rem,
  Text,
  type SelectItemProps,
} from "@mantine/core";

import { type GetCharactersCharacterIdSearchCategoriesItem } from "@jitaspace/esi-client";

import { EveEntityAvatar } from "../../Avatar";
import { EveEntityName } from "../../Text";

export type EveEntitySelectItemProps = SelectItemProps & {
  category: GetCharactersCharacterIdSearchCategoriesItem;
};

export const EveEntitySelectItem = forwardRef<
  HTMLDivElement,
  EveEntitySelectItemProps
>(({ value, category, ...others }, ref) => {
  return (
    <Group noWrap position="apart" ref={ref} {...others}>
      <Group noWrap spacing="xs">
        {value ? (
          <EveEntityAvatar
            entityId={value}
            size={24}
            mr={10}
            variation="icon"
          />
        ) : (
          <Avatar size={16} mr={10} />
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
EveEntitySelectItem.displayName = "EsiSearchSelectItem";

/*
              <EveEntityName
                entityId={value}
                category={category}
                sx={{ lineHeight: 1, fontSize: rem(12) }}
              />
*/
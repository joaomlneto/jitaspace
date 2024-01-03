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


export type EveEntitySelectItemProps = SelectItemProps & {
  category: GetCharactersCharacterIdSearchQueryParamsCategories;
};

export const EveEntitySelectItem = forwardRef<
  HTMLDivElement,
  EveEntitySelectItemProps
>(({value, category, ...others}, ref) => {
  return (
    <Group wrap="nowrap" justify="space-between" ref={ref} {...others}>
      <Group wrap="nowrap" gap="xs">
        {value ? (
          <EveEntityAvatar
            entityId={value}
            size={24}
            mr={10}
            //variation="icon"
          />
        ) : (
          <Avatar size={16} mr={10}/>
        )}
        {value ? (
          <EveEntityName
            entityId={value}
            category={category}
            sx={{lineHeight: 1, fontSize: rem(12)}}
            lineClamp={1}
          />
        ) : (
          <Text sx={{lineHeight: 1, fontSize: rem(12)}}>Unknown</Text>
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

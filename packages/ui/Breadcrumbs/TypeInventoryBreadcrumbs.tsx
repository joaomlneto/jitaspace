import React, { memo } from "react";
import Link from "next/link";
import {
  Anchor,
  Breadcrumbs,
  Text,
  type BreadcrumbsProps,
} from "@mantine/core";

import {
  useGetUniverseGroupsGroupId,
  useGetUniverseTypesTypeId,
} from "@jitaspace/esi-client";

import { CategoryAnchor, GroupAnchor, TypeAnchor } from "../Anchor";
import { CategoryName, GroupName, TypeName } from "../Text";

export type TypeInventoryBreadcrumbsProps = Omit<
  BreadcrumbsProps,
  "children"
> & {
  typeId?: string | number;
};

export const TypeInventoryBreadcrumbs = memo(
  ({ typeId, ...otherProps }: TypeInventoryBreadcrumbsProps) => {
    const { data: type } = useGetUniverseTypesTypeId(
      typeof typeId === "string" ? parseInt(typeId) : typeId ?? 0,
      {},
      {
        swr: { enabled: typeId !== undefined },
      },
    );
    const { data: group } = useGetUniverseGroupsGroupId(
      type?.data.group_id ?? 0,
      {},
      {
        swr: { enabled: type?.data.group_id !== undefined },
      },
    );
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={Link} href="/categories">
          <Text>Inventory</Text>
        </Anchor>
        <CategoryAnchor categoryId={group?.data.category_id}>
          <CategoryName categoryId={group?.data.category_id} />
        </CategoryAnchor>
        <GroupAnchor groupId={type?.data.group_id}>
          <GroupName groupId={type?.data.group_id} />
        </GroupAnchor>
        <TypeAnchor typeId={typeId}>
          <TypeName typeId={typeId} />
        </TypeAnchor>
      </Breadcrumbs>
    );
  },
);
TypeInventoryBreadcrumbs.displayName = "TypeInventoryBreadcrumbs";
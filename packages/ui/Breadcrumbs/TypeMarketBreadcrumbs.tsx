"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import React, { memo } from "react";
import Link from "next/link";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { MarketGroupAnchor, TypeAnchor } from "../Anchor";
import { MarketGroupName, TypeName } from "../Text";

export type MarketGroupEntry = {
  market_group_id: number;
  name: string;
};

export type TypeMarketBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  typeId?: string | number;
  marketGroups?: MarketGroupEntry[];
  showType?: boolean;
};

export const TypeMarketBreadcrumbs = memo(
  ({ typeId, marketGroups, showType = false, ...otherProps }: TypeMarketBreadcrumbsProps) => {
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={Link} href="/market">
          <Text>Market</Text>
        </Anchor>
        {(marketGroups ?? []).map((marketGroup) => (
          <MarketGroupAnchor
            key={marketGroup.market_group_id}
            marketGroupId={marketGroup.market_group_id}
          >
            <MarketGroupName name={marketGroup.name} />
          </MarketGroupAnchor>
        ))}
        {showType && (
          <TypeAnchor typeId={typeId}>
            <TypeName typeId={typeId} />
          </TypeAnchor>
        )}
      </Breadcrumbs>
    );
  },
);
TypeMarketBreadcrumbs.displayName = "TypeMarketBreadcrumbs";

"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo } from "react";
import { Anchor, Breadcrumbs, Text } from "@mantine/core";

import { TypeName } from "@jitaspace/eve-components";
import { MarketGroupName } from "@jitaspace/ui";

import { MarketGroupAnchor, TypeAnchor } from "~/components/Anchor";
import { HoverPrefetchLink } from "~/components/Link";

export interface MarketGroupEntry {
  market_group_id: number;
  name: string;
}

export type TypeMarketBreadcrumbsDisplayProps = Omit<
  BreadcrumbsProps,
  "children"
> & {
  typeId?: string | number;
  marketGroups?: MarketGroupEntry[];
  showType?: boolean;
};

export const TypeMarketBreadcrumbsDisplay = memo(
  ({
    typeId,
    marketGroups,
    showType = false,
    ...otherProps
  }: TypeMarketBreadcrumbsDisplayProps) => {
    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={HoverPrefetchLink} href="/market">
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
TypeMarketBreadcrumbsDisplay.displayName = "TypeMarketBreadcrumbsDisplay";

import React, { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Breadcrumbs,
  Text,
  type BreadcrumbsProps,
} from "@mantine/core";

import {
  getMarketsGroupsMarketGroupId,
  useGetUniverseTypesTypeId,
} from "@jitaspace/esi-client";

import { MarketGroupAnchor, TypeAnchor } from "../Anchor";
import { MarketGroupName, TypeName } from "../Text";


export type TypeMarketBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  typeId?: string | number;
  showType?: boolean;
};

export const TypeMarketBreadcrumbs = memo(
  ({ typeId, showType = false, ...otherProps }: TypeMarketBreadcrumbsProps) => {
    const { data: type } = useGetUniverseTypesTypeId(
      typeof typeId === "string" ? parseInt(typeId) : typeId ?? 0,
      {},
      {},
      {
        query: { enabled: typeId !== undefined },
      },
    );

    const [marketGroups, setMarketGroups] = useState<
      Record<
        number,
        {
          market_group_id: number;
          name: string;
          parent_group_id?: number;
        }
      >
    >({});

    const missingMarketGroupId = useMemo(() => {
      // check if we reached the root
      let missingMarketGroupId = type?.data.market_group_id;
      while (
        missingMarketGroupId !== undefined &&
        marketGroups[missingMarketGroupId] !== undefined
      ) {
        missingMarketGroupId =
          marketGroups[missingMarketGroupId]!.parent_group_id;
      }
      return missingMarketGroupId ?? null;
    }, [type, marketGroups]);

    /**
     * Retrieve necessary market groups
     */
    useEffect(() => {
      console.log("useEffect", { type, marketGroups });
      // check if we are done!
      if (!missingMarketGroupId) return;

      // retrieve the next market group in the chain
      const retrieveMarketGroup = async () => {
        const missingMarketGroup = await getMarketsGroupsMarketGroupId(
          missingMarketGroupId!,
        );
        setMarketGroups((marketGroups) => ({
          ...marketGroups,
          [missingMarketGroup.data.market_group_id]: missingMarketGroup.data,
        }));
      };
      void retrieveMarketGroup();
    }, [type, marketGroups, setMarketGroups]);

    return (
      <Breadcrumbs {...otherProps}>
        <Anchor component={Link} href="/market">
          <Text>Market</Text>
        </Anchor>
        {Object.values(marketGroups).map((marketGroup) => (
          <MarketGroupAnchor
            key={marketGroup.market_group_id}
            marketGroupId={marketGroup.market_group_id}
          >
            <MarketGroupName marketGroupId={marketGroup.market_group_id} />
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

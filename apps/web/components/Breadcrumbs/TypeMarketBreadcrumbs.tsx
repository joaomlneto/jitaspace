"use client";

import type { BreadcrumbsProps } from "@mantine/core";
import { memo, useMemo } from "react";

import { TypeMarketBreadcrumbs as UITypeMarketBreadcrumbs } from "@jitaspace/eve-components";
import { useMarketGroup, useType } from "@jitaspace/hooks";

export type TypeMarketBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  typeId?: string | number;
  showType?: boolean;
};

export const TypeMarketBreadcrumbs = memo(
  ({ typeId, showType, ...otherProps }: TypeMarketBreadcrumbsProps) => {
    const typeIdNum =
      typeof typeId === "string" ? Number.parseInt(typeId) : typeId;
    const { data: type } = useType(typeIdNum ?? 0);

    const level1Id = type?.data.market_group_id ?? 0;
    const level1 = useMarketGroup(level1Id);
    const level2Id = (level1Id && level1.parent_group_id) ?? 0;
    const level2 = useMarketGroup(level2Id);
    const level3Id = (level2Id && level2.parent_group_id) ?? 0;
    const level3 = useMarketGroup(level3Id);
    const level4Id = (level3Id && level3.parent_group_id) ?? 0;
    const level4 = useMarketGroup(level4Id);
    const level5Id = (level4Id && level4.parent_group_id) ?? 0;
    const level5 = useMarketGroup(level5Id);

    const marketGroups = useMemo(() => {
      const groups: { market_group_id: number; name: string }[] = [];
      const levels = [
        { id: level5Id, data: level5 },
        { id: level4Id, data: level4 },
        { id: level3Id, data: level3 },
        { id: level2Id, data: level2 },
        { id: level1Id, data: level1 },
      ];
      for (const { id, data } of levels) {
        if (id && data.name) {
          groups.push({ market_group_id: id, name: data.name });
        }
      }
      return groups.length > 0 ? groups : undefined;
    }, [
      level1,
      level1Id,
      level2,
      level2Id,
      level3,
      level3Id,
      level4,
      level4Id,
      level5,
      level5Id,
    ]);

    return (
      <UITypeMarketBreadcrumbs
        typeId={typeId}
        marketGroups={marketGroups}
        showType={showType}
        {...otherProps}
      />
    );
  },
);
TypeMarketBreadcrumbs.displayName = "TypeMarketBreadcrumbs";

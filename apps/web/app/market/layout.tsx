import type { ReactNode } from "react";

import { prisma } from "@jitaspace/db";

import { MarketLayout } from "~/layouts";

async function getMarketGroups() {
  const marketGroups = await prisma.marketGroup.findMany({
    select: {
      marketGroupId: true,
      name: true,
      parentMarketGroupId: true,
      children: {
        select: {
          marketGroupId: true,
        },
      },
      types: {
        select: {
          typeId: true,
          name: true,
        },
      },
    },
  });

  const marketGroupsIndex: Record<
    number,
    {
      name: string;
      parentMarketGroupId: number | null;
      childrenMarketGroupIds: number[];
      types: { typeId: number; name: string }[];
    }
  > = {};
  marketGroups.forEach(
    (marketGroup) =>
      (marketGroupsIndex[marketGroup.marketGroupId] = {
        name: marketGroup.name,
        parentMarketGroupId: marketGroup.parentMarketGroupId,
        childrenMarketGroupIds: marketGroup.children.map(
          (childMarketGroup) => childMarketGroup.marketGroupId,
        ),
        types: marketGroup.types.map((type) => type),
      }),
  );

  const rootMarketGroupIds = marketGroups
    .filter((marketGroup) => marketGroup.parentMarketGroupId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((marketGroup) => marketGroup.marketGroupId);

  return {
    marketGroups: marketGroupsIndex,
    rootMarketGroupIds,
  };
}

export default async function MarketRouteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const marketGroupsData = await getMarketGroups().catch(() => null);

  return <MarketLayout {...marketGroupsData}>{children}</MarketLayout>;
}

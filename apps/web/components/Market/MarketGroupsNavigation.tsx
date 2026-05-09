import { cacheLife } from "next/cache";

import { prisma } from "@jitaspace/db";

import { MarketGroupNavLink } from "./MarketGroupNavLink";

export async function MarketGroupsNavigation() {
  "use cache";
  cacheLife("hours");

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
        types: marketGroup.types,
      }),
  );

  const rootMarketGroupIds = marketGroups
    .filter((marketGroup) => marketGroup.parentMarketGroupId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((marketGroup) => marketGroup.marketGroupId);

  return (
    <>
      {rootMarketGroupIds.map((marketGroupId) => (
        <MarketGroupNavLink
          marketGroups={marketGroupsIndex}
          marketGroupId={marketGroupId}
          key={marketGroupId}
        />
      ))}
    </>
  );
}

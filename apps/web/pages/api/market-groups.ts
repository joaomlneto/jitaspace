import type {NextApiRequest, NextApiResponse} from "next";

import { prisma } from "@jitaspace/db";

export interface MarketGroupsApiResponseBody {
  marketGroups: Record<
    number,
    {
      name: string;
      parentMarketGroupId: number | null;
      childrenMarketGroupIds: number[];
      types: { typeId: number; name: string }[];
    }
  >;
  rootMarketGroupIds: number[];
}

/**
 * FIXME: This is a temporary route while the Market Groups tree is not made a server-side component.
 * This requires moving a lot to the app router, which is on the roadmap.
 */
export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<MarketGroupsApiResponseBody>,
) {
  try {
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
            (marketGroup) => marketGroup.marketGroupId,
          ),
          types: marketGroup.types.map((type) => type),
        }),
    );

    const rootMarketGroupIds = marketGroups
      .filter((marketGroup) => marketGroup.parentMarketGroupId === null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((marketGroup) => marketGroup.marketGroupId);

    return res
      .setHeader("Cache-Control", "public, max-age=86400") // 24 hours
      .json({
        marketGroups: marketGroupsIndex,
        rootMarketGroupIds,
      });
  } catch {
    return {
      notFound: true,
      revalidate: 3600, // 30 seconds on error
    };
  }
}

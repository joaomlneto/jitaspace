import { type NextApiRequest, type NextApiResponse } from "next";
import axios, { HttpStatusCode } from "axios";
import pLimit from "p-limit";

import { type GetMarketsGroupsMarketGroupId200 } from "@jitaspace/esi-client-kubb";

import { ESI_BASE_URL } from "~/config/constants";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        marketGroups: Record<number, GetMarketsGroupsMarketGroupId200>;
      }
  >,
) {
  // get list of market group IDs
  const marketGroupsResponse = await fetch(
    "https://esi.evetech.net/latest/markets/groups",
  ).then((res) => res.json() as Promise<number[]>);

  // get the details of all market groups
  const limit = pLimit(100);
  let remaining = marketGroupsResponse.length;
  const promises = marketGroupsResponse.map((marketGroupId) =>
    limit(async () => {
      const result = await fetch(
        `https://esi.evetech.net/latest/markets/groups/${marketGroupId}`,
      ).then((res) => res.json() as Promise<GetMarketsGroupsMarketGroupId200>);
      remaining--;
      console.log("remaining", remaining);
      return result;
    }),
  );
  const results = await Promise.all(promises);

  if (!results) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not fetch market groups details" });
  }

  // restructure data into a map of market group ids to market group details
  const marketGroupsMap: Record<number, GetMarketsGroupsMarketGroupId200> = {};
  results.forEach((result) => {
    marketGroupsMap[result.market_group_id] = result;
  });

  /*
  // compute expiration date for cache
  // @ts-expect-error headers should be there!
  const expirationDate = new Date(marketGroupsResponse.headers.get("Expires"));
  const now = new Date();

  const secondsUntilExpirationDate = Math.floor(
    (expirationDate.getTime() - now.getTime()) / 1000,
  );*/

  const response = {
    marketGroups: marketGroupsMap,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
  return Response.json(response);
  /*
    .appendHeader(
      "Cache-Control",
      `public, s-maxage=${
        secondsUntilExpirationDate + TRANQUILITY_DOWNTIME_SECONDS
      }, stale-while-revalidate=3600`,
    )*/
}

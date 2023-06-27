import { type NextApiRequest, type NextApiResponse } from "next";
import axios, { HttpStatusCode } from "axios";
import pLimit from "p-limit";

import {
  getMarketsGroups,
  getMarketsGroupsMarketGroupId,
  type GetMarketsGroupsMarketGroupId200,
} from "@jitaspace/esi-client";

import { ESI_BASE_URL, TRANQUILITY_DOWNTIME_SECONDS } from "~/config/constants";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        marketGroups: Record<number, GetMarketsGroupsMarketGroupId200>;
      }
  >,
) {
  axios.defaults.baseURL = ESI_BASE_URL;

  // get list of market group IDs
  const marketGroupsResponse = await getMarketsGroups();

  if (marketGroupsResponse.status !== HttpStatusCode.Ok) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not fetch market groups" });
  }

  // get the details of all market groups
  const limit = pLimit(300);
  const promises = marketGroupsResponse.data.map((marketGroupId) =>
    limit(() => getMarketsGroupsMarketGroupId(marketGroupId)),
  );
  const results = await Promise.all(promises).catch((e) => {
    console.log(e);
  });

  if (!results) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not fetch market groups details" });
  }

  // restructure data into a map of market group ids to market group details
  const marketGroupsMap: Record<number, GetMarketsGroupsMarketGroupId200> = {};
  results.forEach((result) => {
    marketGroupsMap[result.data.market_group_id] = result.data;
  });

  // compute expiration date for cache
  // @ts-expect-error headers should be there!
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const expirationDate = new Date(marketGroupsResponse.headers.get("Expires"));
  const now = new Date();

  const secondsUntilExpirationDate = Math.floor(
    (expirationDate.getTime() - now.getTime()) / 1000,
  );

  const response = {
    marketGroups: marketGroupsMap,
  };

  return res
    .appendHeader(
      "Cache-Control",
      `public, s-maxage=${
        secondsUntilExpirationDate + TRANQUILITY_DOWNTIME_SECONDS
      }, stale-while-revalidate=3600`,
    )
    .json(response);
}

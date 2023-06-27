import { type NextApiRequest, type NextApiResponse } from "next";
import axios, { HttpStatusCode } from "axios";

import {
  getUniverseGroups,
  getUniverseGroupsGroupId,
  getUniverseTypesTypeId,
  type GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";
import { toArrayIfNot } from "@jitaspace/utils";

import { ESI_BASE_URL, TRANQUILITY_DOWNTIME_SECONDS } from "~/config/constants";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        name: string;
        published: boolean;
        types: Record<string, GetUniverseTypesTypeId200>;
      }
  >,
) {
  axios.defaults.baseURL = ESI_BASE_URL;

  const { groupId } = req.query;

  const requestedGroupId = parseInt(toArrayIfNot(groupId)[0] ?? "");

  // validate whether the requested group exists
  // fetch the first page of groupIDs
  const groupsResponse = await getUniverseGroups();

  if (groupsResponse.status !== HttpStatusCode.Ok) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not fetch groups" });
  }

  const allGroupsIds = [...groupsResponse.data];

  // fetch the remaining pages with groupIDs
  // @ts-expect-error headers should be there!
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const numGroupPages = groupsResponse.headers.get("x-pages");
  for (let page = 2; page <= numGroupPages; page++) {
    const response = await getUniverseGroups({ page });
    allGroupsIds.push(...response.data);
    if (response.status !== HttpStatusCode.Ok) {
      return res
        .status(HttpStatusCode.InternalServerError)
        .json({ error: `Could not fetch groups page ${page}` });
    }
  }

  // sort them numerically?
  //allGroupsIds.sort((a, b) => (a > b ? 1 : -1));

  // check if groupId is a valid category
  if (!groupsResponse.data.includes(requestedGroupId)) {
    return res
      .status(HttpStatusCode.NotFound)
      .json({ error: "Group not found" });
  }

  // get the details of the group
  const groupResponse = await getUniverseGroupsGroupId(requestedGroupId);

  if (groupResponse.status !== HttpStatusCode.Ok) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not fetch group details" });
  }

  const groupTypeIds = groupResponse.data.types;

  // get the details of all types within the group
  const promises = groupTypeIds.map((typeId) => getUniverseTypesTypeId(typeId));
  const results = await Promise.all(promises);

  // restructure data into a map of group ids to group details
  const typesMap = {};
  results.forEach((result) => {
    // @ts-expect-error using numbers to index an object
    typesMap[result.data.type_id] = result.data;
  });

  // compute expiration date for cache
  // @ts-expect-error headers should be there!
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const expirationDate = new Date(groupResponse.headers.get("Expires"));
  const now = new Date();

  const secondsUntilExpirationDate = Math.floor(
    (expirationDate.getTime() - now.getTime()) / 1000,
  );

  const response = {
    name: groupResponse.data.name,
    published: groupResponse.data.published,
    types: typesMap,
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

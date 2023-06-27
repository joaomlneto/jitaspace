import { type NextApiRequest, type NextApiResponse } from "next";
import axios, { HttpStatusCode } from "axios";

import {
  getUniverseCategories,
  getUniverseCategoriesCategoryId,
  getUniverseGroupsGroupId,
  type GetUniverseGroupsGroupId200,
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
        groups: Record<string, GetUniverseGroupsGroupId200>;
      }
  >,
) {
  axios.defaults.baseURL = ESI_BASE_URL;

  const { categoryId } = req.query;

  const requestedCategoryId = parseInt(toArrayIfNot(categoryId)[0] ?? "");

  // validate whether the requested category exists
  const categoriesResponse = await getUniverseCategories();

  if (categoriesResponse.status !== HttpStatusCode.Ok) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not fetch categories" });
  }

  // check if categoryId is a valid category
  if (!categoriesResponse.data.includes(requestedCategoryId)) {
    return res
      .status(HttpStatusCode.NotFound)
      .json({ error: "Category not found" });
  }

  // get the details of the category
  const categoryResponse = await getUniverseCategoriesCategoryId(
    requestedCategoryId,
  );

  if (categoryResponse.status !== HttpStatusCode.Ok) {
    return res
      .status(HttpStatusCode.InternalServerError)
      .json({ error: "Could not fetch category details" });
  }

  const categoryGroupIds = categoryResponse.data.groups;

  // get the details of all groups within the category
  const promises = categoryGroupIds.map((groupId) =>
    getUniverseGroupsGroupId(groupId),
  );
  const results = await Promise.all(promises);

  // restructure data into a map of group ids to group details
  const groupsMap = {};
  results.forEach((result) => {
    // @ts-expect-error using numbers to index an object
    groupsMap[result.data.group_id] = result.data;
  });

  // compute expiration date for cache
  // @ts-expect-error headers should be there!
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const expirationDate = new Date(categoryResponse.headers.get("Expires"));
  const now = new Date();

  const secondsUntilExpirationDate = Math.floor(
    (expirationDate.getTime() - now.getTime()) / 1000,
  );

  const response = {
    name: categoryResponse.data.name,
    published: categoryResponse.data.published,
    groups: groupsMap,
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

"use client";

import type { GetUniverseGroupsGroupIdQueryResponse } from "@jitaspace/esi-client";
import { useGetUniverseGroupsGroupId } from "@jitaspace/esi-client";

export type Group = GetUniverseGroupsGroupIdQueryResponse;

/**
 * An item group from ESI.
 *
 * Unlike almost every other ESI id, group ids start at 0: `/universe/groups/0`
 * is "#System", a real group the site links to and lists in its sitemap. The
 * generated hook enables itself on `!!(group_id)`, so it never fetched group 0
 * and every consumer sat on its loading skeleton forever. This enables on
 * `!== undefined` instead — so pass `undefined`, not a `?? 0` placeholder,
 * while the id is still unknown, or you will fetch and render "#System".
 */
export const useGroup: typeof useGetUniverseGroupsGroupId = (
  groupId,
  headers,
  options = {},
) =>
  useGetUniverseGroupsGroupId(groupId, headers, {
    ...options,
    query: { enabled: groupId !== undefined, ...options.query },
  });

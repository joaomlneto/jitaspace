"use client";

import type { Localized, SdeGroup, SdeHookOptions } from "../../sde";
import { useSdeRecord } from "../../sde";

export type Group = Localized<SdeGroup>;

/**
 * An item group from the SDE.
 *
 * Unlike almost every other id, group ids start at 0: group 0 is "#System", a
 * real group the site links to and lists in its sitemap. So pass `undefined`,
 * not a `?? 0` placeholder, while the id is still unknown, or you will fetch
 * and render "#System".
 */
export const useGroup = (
  groupId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("groups", groupId, options);

"use client";

import type { GetUniverseCategoriesCategoryIdQueryResponse } from "@jitaspace/esi-client";
import { useGetUniverseCategoriesCategoryId } from "@jitaspace/esi-client";

export type Category = GetUniverseCategoriesCategoryIdQueryResponse;

/**
 * An item category from ESI.
 *
 * Category ids start at 0, like group ids — see `useGroup` for why this wraps
 * the generated hook rather than re-exporting it. Pass `undefined`, not a
 * `?? 0` placeholder, while the id is still unknown.
 */
export const useCategory: typeof useGetUniverseCategoriesCategoryId = (
  categoryId,
  headers,
  options = {},
) =>
  useGetUniverseCategoriesCategoryId(categoryId, headers, {
    ...options,
    query: { enabled: categoryId !== undefined, ...options.query },
  });

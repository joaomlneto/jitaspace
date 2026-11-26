"use client";

import type { Localized, SdeCategory, SdeHookOptions } from "../../sde";
import { useSdeRecord } from "../../sde";

export type Category = Localized<SdeCategory>;

/**
 * An item category from the SDE.
 *
 * Category ids start at 0, like group ids — see `useGroup`. Pass `undefined`,
 * not a `?? 0` placeholder, while the id is still unknown.
 */
export const useCategory = (
  categoryId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("categories", categoryId, options);

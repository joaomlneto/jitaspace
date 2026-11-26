"use client";

import type { Localized, SdeBloodline, SdeHookOptions } from "../../sde";
import { useSdeRecord } from "../../sde";

/**
 * A bloodline from the SDE. Its starter ship is its race's (`useRace`), which
 * is where ESI's `ship_type_id` came from too.
 */
export type Bloodline = Localized<SdeBloodline>;

export const useBloodline = (
  bloodlineId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("bloodlines", bloodlineId, options);

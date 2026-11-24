"use client";

import { useSdeRecords } from "../../sde";

/** Several types at once, keyed by type id. See `useSdeRecords`. */
export const useTypes = (typeIds: readonly number[]) =>
  useSdeRecords("types", typeIds);

/**
 * Several types' dogma at once, keyed by type id. A type with no dogma has no
 * record, so it shows up in `failedIds`, not in `data`.
 */
export const useTypesDogma = (typeIds: readonly number[]) =>
  useSdeRecords("typeDogma", typeIds);

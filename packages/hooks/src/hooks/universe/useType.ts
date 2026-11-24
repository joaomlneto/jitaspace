"use client";

import type {
  Localized,
  SdeHookOptions,
  SdeType,
  SdeTypeDogma,
} from "../../sde";
import { useSdeRecord } from "../../sde";

export type Type = Localized<SdeType>;
export type TypeDogma = SdeTypeDogma;

/** An item type from the SDE. Pass `undefined` while the id is unknown. */
export const useType = (typeId: number | undefined, options?: SdeHookOptions) =>
  useSdeRecord("types", typeId, options);

/**
 * A type's dogma attributes and effects. A type with none has no record, which
 * reads as an error (404) rather than as empty lists.
 */
export const useTypeDogma = (
  typeId: number | undefined,
  options?: SdeHookOptions,
) => useSdeRecord("typeDogma", typeId, options);

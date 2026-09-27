"use client";

import { useGetDogmaAttributesAttributeId } from "@jitaspace/esi-client";

/**
 * This used to gate on `enabled: ids?.data.includes(attributeId)` against the
 * full /dogma/attributes id list. That value is `undefined` while the list
 * loads, which react-query reads as enabled — so the gate never gated, the
 * list (~2.7k ids) was fetched for nothing, and passing `enabled` at all
 * overrode the generated hook's own `!!attribute_id` guard against id 0. Making
 * the gate real would instead put every attribute fetch behind that download.
 * The generated default is the guard worth keeping.
 */
export const useDogmaAttribute = (attributeId: number) =>
  useGetDogmaAttributesAttributeId(attributeId);

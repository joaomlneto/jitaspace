"use client";

import type {
  GetDogmaAttributesAttributeIdHeaderParams,
  GetDogmaAttributesAttributeIdQueryResponse,
} from "@jitaspace/esi-client";
import { getDogmaAttributesAttributeIdQueryOptions } from "@jitaspace/esi-client";

import {
  REFERENCE_DATA_STALE_TIME_MS,
  useEsiQueriesById,
} from "../utils/useEsiQueriesById";

const attributeIdOf = (attribute: GetDogmaAttributesAttributeIdQueryResponse) =>
  attribute.attribute_id;

/** Several dogma attributes at once, keyed by attribute id. See useEsiQueriesById. */
export const useDogmaAttributes = (
  attributeIds: number[],
  headers?: GetDogmaAttributesAttributeIdHeaderParams,
) =>
  useEsiQueriesById(
    attributeIds,
    (attributeId) => ({
      ...getDogmaAttributesAttributeIdQueryOptions(attributeId, headers),
      staleTime: REFERENCE_DATA_STALE_TIME_MS,
    }),
    attributeIdOf,
  );

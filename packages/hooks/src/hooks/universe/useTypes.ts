"use client";

import type {
  GetUniverseTypesTypeIdHeaderParams,
  GetUniverseTypesTypeIdQueryResponse,
} from "@jitaspace/esi-client";
import { getUniverseTypesTypeIdQueryOptions } from "@jitaspace/esi-client";

import {
  REFERENCE_DATA_STALE_TIME_MS,
  useEsiQueriesById,
} from "../utils/useEsiQueriesById";

const typeIdOf = (type: GetUniverseTypesTypeIdQueryResponse) => type.type_id;

/** Several types at once, keyed by type id. See useEsiQueriesById. */
export const useTypes = (
  typeIds: number[],
  headers?: GetUniverseTypesTypeIdHeaderParams,
) =>
  useEsiQueriesById(
    typeIds,
    (typeId) => ({
      ...getUniverseTypesTypeIdQueryOptions(typeId, headers),
      staleTime: REFERENCE_DATA_STALE_TIME_MS,
    }),
    typeIdOf,
  );

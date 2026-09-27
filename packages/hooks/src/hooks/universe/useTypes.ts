"use client";

import type {
  GetUniverseTypesTypeIdHeaderParams,
  GetUniverseTypesTypeIdQueryResponse,
} from "@jitaspace/esi-client";
import { getUniverseTypesTypeIdQueryOptions } from "@jitaspace/esi-client";

import { useEsiQueriesById } from "../utils/useEsiQueriesById";

const typeIdOf = (type: GetUniverseTypesTypeIdQueryResponse) => type.type_id;

/** Several types at once, keyed by type id. See useEsiQueriesById. */
export const useTypes = (
  typeIds: number[],
  headers?: GetUniverseTypesTypeIdHeaderParams,
) =>
  useEsiQueriesById(
    typeIds,
    (typeId) => getUniverseTypesTypeIdQueryOptions(typeId, headers),
    typeIdOf,
  );

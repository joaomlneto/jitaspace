"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  GetUniverseSchematicsSchematicIdQueryResponse,
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import {
  getUniverseSchematicsSchematicId,
  getUniverseSchematicsSchematicIdQueryKey,
} from "@jitaspace/esi-client";

import {
  REFERENCE_DATA_STALE_TIME_MS,
  useEsiQueriesById,
} from "../utils/useEsiQueriesById";

/**
 * A planetary-industry schematic, as ESI describes it: its name and how long a
 * run takes. ESI does not list its inputs and outputs; those are SDE data.
 *
 * ESI's response does not repeat the id it was asked for, so it is added here.
 */
export type PlanetSchematic = GetUniverseSchematicsSchematicIdQueryResponse & {
  schematic_id: number;
};

/** One schematic's query, shared by the single and the by-id hook. */
export const planetSchematicQueryOptions = (schematicId: number) => ({
  // The generated key, so this shares a cache entry with the generated hook.
  queryKey: getUniverseSchematicsSchematicIdQueryKey(schematicId),
  enabled: schematicId > 0,
  staleTime: REFERENCE_DATA_STALE_TIME_MS,
  queryFn: async ({ signal }: { signal?: AbortSignal } = {}): Promise<
    ResponseConfig<PlanetSchematic>
  > => {
    const response = await getUniverseSchematicsSchematicId(
      schematicId,
      {},
      { signal },
    );
    return {
      ...response,
      data: { ...response.data, schematic_id: schematicId },
    };
  },
});

/** A planetary-industry schematic's name and cycle time. */
export const usePlanetSchematic = (schematicId?: number) =>
  useQuery<ResponseConfig<PlanetSchematic>, ResponseErrorConfig<Error>>(
    planetSchematicQueryOptions(schematicId ?? 0),
  );

const schematicIdOf = (schematic: PlanetSchematic) => schematic.schematic_id;

/** Several schematics at once, keyed by schematic id. See useEsiQueriesById. */
export const usePlanetSchematics = (schematicIds: readonly number[]) =>
  useEsiQueriesById(
    schematicIds.filter((schematicId) => schematicId > 0),
    planetSchematicQueryOptions,
    schematicIdOf,
  );

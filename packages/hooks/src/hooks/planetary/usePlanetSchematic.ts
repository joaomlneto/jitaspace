"use client";

import type { GetUniverseSchematicsSchematicIdQueryResponse } from "@jitaspace/esi-client";
import {
  getUniverseSchematicsSchematicIdQueryOptions,
  useGetUniverseSchematicsSchematicId,
} from "@jitaspace/esi-client";

import {
  REFERENCE_DATA_STALE_TIME_MS,
  useEsiQueriesById,
} from "../utils/useEsiQueriesById";

/**
 * A planetary-industry schematic, as ESI describes it: its name and how long a
 * run takes. ESI does not list its inputs and outputs; those are SDE data.
 *
 * Kept exactly as ESI sends it, which does not repeat the schematic's id: the
 * generated hook caches the same response under the same key, so a reshaped
 * copy here would be overwritten by whichever of the two fetched last.
 */
export type PlanetSchematic = GetUniverseSchematicsSchematicIdQueryResponse;

/** A planetary-industry schematic's name and cycle time. */
export const usePlanetSchematic = (schematicId?: number) =>
  useGetUniverseSchematicsSchematicId(schematicId ?? 0, undefined, {
    query: {
      enabled: schematicId !== undefined && schematicId > 0,
      staleTime: REFERENCE_DATA_STALE_TIME_MS,
    },
  });

// The response has no id of its own, so each is keyed by the id it was
// requested by.
const requestedSchematicId = (
  _schematic: PlanetSchematic,
  requestedId: number,
) => requestedId;

/** Several schematics at once, keyed by schematic id. See useEsiQueriesById. */
export const usePlanetSchematics = (schematicIds: readonly number[]) =>
  useEsiQueriesById(
    schematicIds.filter((schematicId) => schematicId > 0),
    (schematicId) => ({
      ...getUniverseSchematicsSchematicIdQueryOptions(schematicId),
      staleTime: REFERENCE_DATA_STALE_TIME_MS,
    }),
    requestedSchematicId,
  );

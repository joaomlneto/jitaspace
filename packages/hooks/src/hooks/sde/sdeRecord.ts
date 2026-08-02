"use client";

import { queryOptions } from "@tanstack/react-query";

/**
 * Client-side reads of the static EVE reference data (types, groups, market
 * groups, dogma metadata, agents) that used to come from the SDE HTTP API.
 *
 * The data now lives in our own database and is served by the web app's
 * `/api/sde/:resource/:id` route, which caches each response for a day. These
 * helpers are for client components that only learn which ids they need at
 * render time; anything that can resolve its ids on the server should read
 * Prisma directly in a `use cache`d server component instead.
 */

export type SdeResource =
  | "type"
  | "group"
  | "category"
  | "market-group"
  | "race"
  | "faction"
  | "dogma-attribute"
  | "dogma-effect"
  | "dogma-unit"
  | "dogma-attribute-category"
  | "agent";

export interface SdeType {
  typeId: number;
  name: string;
  groupId: number;
  marketGroupId: number | null;
}

export interface SdeGroup {
  groupId: number;
  name: string;
  categoryId: number;
}

export interface SdeCategory {
  categoryId: number;
  name: string;
}

export interface SdeMarketGroup {
  marketGroupId: number;
  name: string;
  description: string;
  parentMarketGroupId: number | null;
  iconId: number | null;
}

export interface SdeRace {
  raceId: number;
  name: string;
}

export interface SdeFaction {
  factionId: number;
  name: string;
}

export interface SdeDogmaAttribute {
  attributeId: number;
  name: string | null;
  displayName: string | null;
  unitId: number | null;
  iconId: number | null;
  highIsGood: boolean | null;
  attributeCategoryId: number | null;
}

export interface SdeDogmaEffect {
  effectId: number;
  name: string | null;
  displayName: string | null;
}

export interface SdeDogmaUnit {
  unitId: number;
  name: string;
  displayName: string | null;
}

export interface SdeDogmaAttributeCategory {
  attributeCategoryId: number;
  name: string;
  description: string | null;
}

export interface SdeAgentInSpace {
  dungeonId: number;
  solarSystemId: number;
  spawnPointId: number;
  typeId: number;
}

export interface SdeAgent {
  characterId: number;
  agentTypeId: number;
  agentDivisionId: number;
  agentDivisionName: string;
  isLocator: boolean;
  level: number;
  stationId: number;
  corporationId: number;
  isResearchAgent: boolean;
  researchSkills: number[];
  agentInSpace: SdeAgentInSpace | null;
}

/** Maps each resource to the shape `/api/sde/:resource/:id` returns for it. */
export interface SdeRecordByResource {
  type: SdeType;
  group: SdeGroup;
  category: SdeCategory;
  "market-group": SdeMarketGroup;
  race: SdeRace;
  faction: SdeFaction;
  "dogma-attribute": SdeDogmaAttribute;
  "dogma-effect": SdeDogmaEffect;
  "dogma-unit": SdeDogmaUnit;
  "dogma-attribute-category": SdeDogmaAttributeCategory;
  agent: SdeAgent;
}

/**
 * Fetch one record. A 404 resolves to `null` rather than throwing: "no such id"
 * is a normal answer here (an entity newer than the last SDE ingest, or a
 * character that simply isn't an agent), and callers render a fallback for it.
 */
async function fetchSdeRecord<R extends SdeResource>(
  resource: R,
  id: number,
): Promise<SdeRecordByResource[R] | null> {
  const response = await fetch(`/api/sde/${resource}/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Failed to load ${resource} ${id}: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as SdeRecordByResource[R];
}

/**
 * React Query options for a single reference record. The data only changes with
 * an SDE release, so it never goes stale within a session, and a failed lookup
 * is not worth retrying.
 */
export function sdeRecordQueryOptions<R extends SdeResource>(
  resource: R,
  id: number | undefined,
) {
  // `enabled` keeps the query from running without a usable id, so the fetch
  // never sees the 0 fallback.
  const resolvedId = id ?? 0;
  return queryOptions({
    queryKey: ["sde", resource, id] as const,
    queryFn: () => fetchSdeRecord(resource, resolvedId),
    enabled: resolvedId > 0,
    staleTime: Infinity,
    retry: false,
  });
}

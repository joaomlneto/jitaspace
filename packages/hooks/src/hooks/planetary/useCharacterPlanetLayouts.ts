"use client";

import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import type {
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import { getCharactersCharacterIdPlanetsPlanetIdQueryOptions } from "@jitaspace/esi-client";

import type { ColonyLayout } from "./useCharacterPlanetLayout";
import { useEsiSubjects } from "../auth";
import { PLANETS_SCOPE } from "./scopes";

/** Identifies one colony: a planet, as seen by the character who owns it. */
export interface ColonyRef {
  characterId: number;
  planetId: number;
}

/** The key {@link useCharacterPlanetLayouts} indexes its results by. */
export const colonyKey = ({ characterId, planetId }: ColonyRef) =>
  `${characterId}:${planetId}`;

export interface CharacterPlanetLayouts {
  /** Every layout that has resolved, keyed by {@link colonyKey}. */
  data: Record<string, ColonyLayout>;
  /** True while any colony is still on its first load. */
  isLoading: boolean;
  /** Failures, attributed to the colony whose layout failed. */
  errors: (ColonyRef & { error: ResponseErrorConfig<Error> })[];
  /**
   * The colonies no logged-in character can read: not logged in, or without
   * the planets scope. They are not requested.
   */
  unauthorized: ColonyRef[];
  /** Keys of the colonies still on their first load. */
  pendingKeys: string[];
}

/**
 * The layouts of several colonies at once, across any of the logged-in
 * characters — typically every colony `useMultipleCharacterPlanets` listed.
 *
 * Each colony is its own query, signed with its owner's token and sharing its
 * cache entry with {@link useCharacterPlanetLayout}, so one failed colony does
 * not hide the others.
 */
export const useCharacterPlanetLayouts = (
  colonies: readonly ColonyRef[],
): CharacterPlanetLayouts => {
  const subjects = useEsiSubjects({
    kind: "character",
    scopes: [PLANETS_SCOPE],
  });

  // Keyed by content, so a caller passing a fresh array each render keeps the
  // same queries and the same memoised result.
  const coloniesKey = colonies.map(colonyKey).join(",");

  const { authorized, unauthorized, queries } = useMemo(() => {
    const headersByCharacter = new Map(
      subjects.map((subject) => [subject.id, subject.authHeaders]),
    );
    const refs: ColonyRef[] =
      coloniesKey === ""
        ? []
        : coloniesKey.split(",").map((key) => {
            const [characterId, planetId] = key.split(":").map(Number);
            return { characterId: characterId ?? 0, planetId: planetId ?? 0 };
          });
    const authorized = refs.filter((ref) =>
      headersByCharacter.has(ref.characterId),
    );
    return {
      authorized,
      unauthorized: refs.filter(
        (ref) => !headersByCharacter.has(ref.characterId),
      ),
      queries: authorized.map((ref) =>
        getCharactersCharacterIdPlanetsPlanetIdQueryOptions(
          ref.characterId,
          ref.planetId,
          headersByCharacter.get(ref.characterId),
        ),
      ) as unknown as UseQueryOptions<
        ResponseConfig<ColonyLayout>,
        ResponseErrorConfig<Error>
      >[],
    };
  }, [subjects, coloniesKey]);

  const combine = useCallback(
    (
      results: UseQueryResult<
        ResponseConfig<ColonyLayout>,
        ResponseErrorConfig<Error>
      >[],
    ): CharacterPlanetLayouts => {
      const data: Record<string, ColonyLayout> = {};
      const errors: CharacterPlanetLayouts["errors"] = [];
      const pendingKeys: string[] = [];
      // Index-aligned: the queries were built from `authorized`, in order.
      results.forEach((result, index) => {
        const ref = authorized[index];
        if (!ref) return;
        if (result.data) data[colonyKey(ref)] = result.data.data;
        if (result.error) errors.push({ ...ref, error: result.error });
        if (result.isPending) pendingKeys.push(colonyKey(ref));
      });
      return {
        data,
        errors,
        unauthorized,
        pendingKeys,
        isLoading: results.some((result) => result.isLoading),
      };
    },
    [authorized, unauthorized],
  );

  return useQueries({ queries, combine });
};

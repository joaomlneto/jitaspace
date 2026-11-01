"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  GetCharactersFreelanceJobsListingQueryResponse,
  ResponseConfig,
} from "@jitaspace/esi-client";
import { getCharactersFreelanceJobsListingQueryOptions } from "@jitaspace/esi-client";

import type { EsiSubject } from "../auth";
import type { EsiSubjectItem, MultiEsiQueryResult } from "../multi";
import type { SubjectQueryOptions } from "../multi/useEsiSubjectQueries";
import type { FreelanceJob } from "./freelanceJobTypes";
import { useAccessToken } from "../auth";
import { useEsiSubjectQueries } from "../multi/useEsiSubjectQueries";
import { CHARACTER_FREELANCE_JOBS_SCOPE } from "./freelanceJobTypes";

const selectJobs = (
  response: ResponseConfig<GetCharactersFreelanceJobsListingQueryResponse>,
) => response.data.freelance_jobs;

/**
 * The freelance jobs one character is actively participating in.
 *
 * ESI lists only current participation — a job the character resigned from,
 * was kicked from or that has finished drops out — and does not paginate it.
 */
export function useCharacterFreelanceJobs(characterId?: number) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [CHARACTER_FREELANCE_JOBS_SCOPE],
  });

  return useQuery({
    // The generated options as they are, so this shares a cache entry with
    // the multi-character hooks below and useMultipleCharacterFreelanceJobs.
    ...getCharactersFreelanceJobsListingQueryOptions(characterId, authHeaders),
    enabled: characterId !== undefined && accessToken !== null,
    select: selectJobs,
  });
}

// Module-level so its identity is stable: useEsiSubjectQueries rebuilds the
// queries whenever it changes.
const buildCharacterJobsQuery = (subject: EsiSubject) =>
  ({
    ...getCharactersFreelanceJobsListingQueryOptions(
      subject.id,
      subject.authHeaders,
    ),
    select: (
      response: ResponseConfig<GetCharactersFreelanceJobsListingQueryResponse>,
    ) =>
      response.data.freelance_jobs.map((job) => ({
        ...job,
        subjectId: subject.id,
      })),
  }) as unknown as SubjectQueryOptions<EsiSubjectItem<FreelanceJob>[]>;

/**
 * The freelance jobs several characters are participating in, as one list.
 *
 * Each job is tagged with the character it came from (`subjectId`), so a job
 * two of the characters share appears once per character. Omit `characterIds`
 * for every logged-in character that granted the scope; ids that are not
 * logged in, or did not grant it, are skipped.
 */
export function useCharactersFreelanceJobs(
  characterIds?: readonly number[],
): MultiEsiQueryResult<FreelanceJob> {
  const { selected, ...envelope } = useEsiSubjectQueries(
    {
      kind: "character",
      scopes: [CHARACTER_FREELANCE_JOBS_SCOPE],
      subjectIds: characterIds,
    },
    buildCharacterJobsQuery,
  );

  const data = useMemo(
    () => selected.flatMap((jobs) => jobs ?? []),
    [selected],
  );

  return { ...envelope, data };
}

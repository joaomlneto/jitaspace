"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  GetCharactersFreelanceJobsParticipationQueryResponse,
  ResponseConfig,
} from "@jitaspace/esi-client";
import { getCharactersFreelanceJobsParticipationQueryOptions } from "@jitaspace/esi-client";

import type { EsiSubject } from "../auth";
import type { EsiSubjectValue, MultiEsiValueQueryResult } from "../multi";
import type { SubjectQueryOptions } from "../multi/useEsiSubjectQueries";
import type { FreelanceJobParticipation } from "./freelanceJobTypes";
import { useAccessToken } from "../auth";
import { useEsiSubjectQueries } from "../multi/useEsiSubjectQueries";
import {
  CHARACTER_FREELANCE_JOBS_SCOPE,
  isFreelanceJobId,
} from "./freelanceJobTypes";

const NO_CHARACTERS: readonly number[] = [];

const selectParticipation = (
  response: ResponseConfig<GetCharactersFreelanceJobsParticipationQueryResponse>,
) => response.data;

/**
 * One character's participation in a job: whether it is committed, kicked or
 * resigned, and how much it has contributed.
 *
 * ESI answers 404 for a job the character never joined, and counts it against
 * the error limit — so ask only for jobs the character's listing contains.
 */
export function useCharacterFreelanceJobParticipation(
  characterId: number | undefined,
  jobId: string | undefined,
) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [CHARACTER_FREELANCE_JOBS_SCOPE],
  });

  return useQuery({
    ...getCharactersFreelanceJobsParticipationQueryOptions(
      characterId,
      jobId,
      authHeaders,
    ),
    enabled:
      characterId !== undefined &&
      isFreelanceJobId(jobId) &&
      accessToken !== null,
    select: selectParticipation,
  });
}

/**
 * Several characters' participation in one job, one entry per character.
 *
 * `characterIds` is required rather than defaulting to every character, for
 * the reason {@link useCharacterFreelanceJobParticipation} gives: pass the
 * characters whose listing holds the job.
 */
export function useCharactersFreelanceJobParticipation(
  jobId: string | undefined,
  characterIds: readonly number[],
): MultiEsiValueQueryResult<FreelanceJobParticipation> {
  const enabled = isFreelanceJobId(jobId);

  const buildQuery = useCallback(
    (subject: EsiSubject) =>
      ({
        ...getCharactersFreelanceJobsParticipationQueryOptions(
          subject.id,
          jobId,
          subject.authHeaders,
        ),
        enabled,
        select: (
          response: ResponseConfig<GetCharactersFreelanceJobsParticipationQueryResponse>,
        ) => ({ subjectId: subject.id, data: response.data }),
      }) as unknown as SubjectQueryOptions<
        EsiSubjectValue<FreelanceJobParticipation>
      >,
    [jobId, enabled],
  );

  const { selected, ...envelope } = useEsiSubjectQueries(
    {
      kind: "character",
      scopes: [CHARACTER_FREELANCE_JOBS_SCOPE],
      // Nobody to ask about a malformed id, rather than queries left disabled
      // that would report pending forever.
      subjectIds: enabled ? characterIds : NO_CHARACTERS,
    },
    buildQuery,
  );

  const data = useMemo(
    () => selected.flatMap((value) => value ?? []),
    [selected],
  );

  return { ...envelope, data };
}
